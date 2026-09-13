/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import agentTest from "@convex-dev/agent/test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, components, internal } from "./_generated/api";
import schema from "./schema";
import { RUN_LEASE_MS } from "./checklistExecution";
import type { Doc } from "./_generated/dataModel";
import { loadItemContext } from "./jobAgentContext";
import { classificationSnapshot } from "./itemAgentData";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function setup(count = 1) {
  const t = convexTest(schema, modules);
  agentTest.register(t);

  const fixture = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Owner" });
    const staffId = await ctx.db.insert("users", { name: "Staff" });
    const otherId = await ctx.db.insert("users", { name: "Other" });

    const organizationId = await ctx.db.insert("organizations", {
      name: "Execution fixtures",
    });

    const otherOrg = await ctx.db.insert("organizations", {
      name: "Other organization",
    });

    await ctx.db.insert("memberships", {
      userId,
      organizationId,
      role: "owner",
      state: "active",
    });

    const staffMembershipId = await ctx.db.insert("memberships", {
      userId: staffId,
      organizationId,
      role: "staff",
      state: "active",
    });

    await ctx.db.insert("memberships", {
      userId: otherId,
      organizationId: otherOrg,
      role: "owner",
      state: "active",
    });

    const inputId = await ctx.db.insert("inputs", {
      organizationId,
      processedText: "Renovation",
      addressText: "Site",
    });

    const jobId = await ctx.db.insert("jobs", {
      organizationId,
      inputId,
      addressText: "Site",
      status: "pending",
    });

    const items: Doc<"checklistItems">[] = [];

    for (let i = 0; i < count; i += 1) {
      const itemId = await ctx.db.insert("checklistItems", {
        jobId,
        title: i === 1 ? "Air Quality" : "Construction year",
        kind: "automated",
        status: "pending",
        notes: "Human note",
      });

      await ctx.db.insert("checklistAgentStates", {
        itemId,
        jobId,
        classification: {
          status: "succeeded",
          traceId: "a".repeat(32),
          spanId: "b".repeat(16),
          initiatedBy: userId,
        },
        execution: "idle",
        currentStep: "ready",
        updatedAt: Date.now(),
        provenance: [],
        missingInformation: [],
        nextAction: "Ready",
      });
      const item = await ctx.db.get("checklistItems", itemId);

      if (item === null) throw new Error("Fixture missing");
      const context = await loadItemContext(ctx.db, item);

      const state = await ctx.db
        .query("checklistAgentStates")
        .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
        .unique();

      if (context === null || state === null)
        throw new Error("Fixture context missing");
      await ctx.db.patch("checklistAgentStates", state._id, {
        classification: {
          ...state.classification,
          snapshot: classificationSnapshot(context),
        },
      });
      items.push(item);
    }

    return { userId, staffId, otherId, staffMembershipId, jobId, items };
  });

  const states = () =>
    t.run((ctx) =>
      ctx.db
        .query("checklistAgentStates")
        .withIndex("by_jobId", (q) => q.eq("jobId", fixture.jobId))
        .take(100),
    );

  const enqueue = (item = fixture.items[0]) =>
    t.mutation(internal.checklistExecution.enqueue, {
      item,
      initiatedBy: fixture.userId,
      classificationTraceId: "a".repeat(32),
    });

  const drain = () =>
    t.mutation(internal.checklistExecution.drain, { jobId: fixture.jobId });

  return {
    t,
    ...fixture,
    states,
    enqueue,
    drain,
    staff: t.withIdentity({ subject: `${fixture.staffId}|session` }),
    other: t.withIdentity({ subject: `${fixture.otherId}|session` }),
  };
}

test("duplicate dispatch atomically creates one thread and a three-run queue drains all siblings", async () => {
  const { t, items, enqueue, drain, states } = await setup(8);

  for (const item of items) expect(await enqueue(item)).toBe(true);
  expect(await enqueue()).toBe(false);
  await drain();
  await drain();
  let current = await states();
  expect(current.filter((state) => state.execution === "running")).toHaveLength(
    3,
  );
  expect(current.filter((state) => state.queued)).toHaveLength(5);
  const firstThread = current[0].threadId;
  await drain();
  expect((await states())[0].threadId).toBe(firstThread);

  for (let round = 0; round < 3; round += 1) {
    for (const state of current.filter(
      (value) => value.execution === "running",
    )) {
      await t.mutation(internal.checklistExecution.fail, {
        itemId: state.itemId,
        runId: state.runId!,
        reason: "source_http_503",
      });
    }

    await drain();
    current = await states();
    expect(
      current.filter((state) => state.execution === "running").length,
    ).toBeLessThanOrEqual(3);
  }

  expect(
    current.every((state) => state.execution === "failed" && !state.queued),
  ).toBe(true);
  expect(new Set(current.map((state) => state.threadId)).size).toBe(8);
});

test("done, on-site and unsuccessful classification get no execution thread", async () => {
  const { t, items, enqueue, drain, states } = await setup(3);
  await t.run(async (ctx) => {
    await ctx.db.patch("checklistItems", items[0]._id, { status: "done" });
    await ctx.db.patch("checklistItems", items[1]._id, { kind: "on_site" });

    const state = await ctx.db
      .query("checklistAgentStates")
      .withIndex("by_itemId", (q) => q.eq("itemId", items[2]._id))
      .unique();

    await ctx.db.patch("checklistAgentStates", state!._id, {
      classification: { status: "failed", error: "model_output_error" },
    });
  });

  for (const item of items) expect(await enqueue(item)).toBe(false);
  await drain();
  expect((await states()).every((state) => state.threadId === undefined)).toBe(
    true,
  );
});

test("another active organization member retries only one item on the existing thread without classification", async () => {
  const { t, staff, other, staffId, items, enqueue, drain, states } =
    await setup(2);

  for (const item of items) await enqueue(item);
  await drain();
  const [first, sibling] = await states();
  await t.mutation(internal.checklistExecution.fail, {
    itemId: first.itemId,
    runId: first.runId!,
    reason: "source_http_503",
  });
  await expect(
    other.mutation(api.checklistExecution.retry, { itemId: first.itemId }),
  ).rejects.toThrow("Job not found");
  await staff.mutation(api.checklistExecution.retry, { itemId: first.itemId });
  await staff.mutation(api.checklistExecution.retry, { itemId: first.itemId });
  await drain();
  const [retried, unchanged] = await states();
  expect(retried).toMatchObject({
    threadId: first.threadId,
    attempt: 2,
    initiatedBy: staffId,
    execution: "running",
    classification: first.classification,
  });
  expect(retried.runId).not.toBe(first.runId);
  expect(unchanged).toEqual(sibling);
  expect(
    await t.mutation(internal.checklistExecution.fail, {
      itemId: first.itemId,
      runId: first.runId!,
      reason: "late_failure",
    }),
  ).toBe(false);
});

test("lease recovery preserves the thread and rejects late writes while freeing a queued sibling", async () => {
  const { t, items, enqueue, drain, states } = await setup(4);

  for (const item of items) await enqueue(item);
  await drain();
  const first = (await states())[0];
  vi.setSystemTime(Date.now() + RUN_LEASE_MS + 1);
  await t.mutation(internal.checklistExecution.expire, {
    itemId: first.itemId,
    runId: first.runId!,
  });
  await drain();
  const current = await states();
  expect(current[0]).toMatchObject({
    threadId: first.threadId,
    error: "execution_deadline_exceeded",
    execution: "failed",
  });
  expect(current[3].execution).toBe("running");
  expect(
    await t.query(internal.checklistExecution.getRun, {
      itemId: first.itemId,
      runId: first.runId!,
    }),
  ).toBeNull();
});

test("only a persisted matching finding completes an item; unresolved evidence stays pending", async () => {
  const { t, items, enqueue, drain, states } = await setup(2);

  for (const item of items) await enqueue(item);
  await drain();
  const [first, second] = await states();
  await t.mutation(internal.checklistExecution.saveEvidence, {
    itemId: first.itemId,
    runId: first.runId!,
    traceId: "c".repeat(32),
    result: {
      status: "resolved",
      finding: {
        kind: "construction_year",
        summary: "1940",
        observedAt: Date.now(),
        address: "Site",
        constructionYear: 1940,
        pre1990: true,
        resolution: "live_api",
        lookupOutcome: "exact_match",
        coverage: "Historical record",
      },
      provenance: [
        { source: "DataVic", method: "live_api", observedAt: Date.now() },
      ],
    },
  });
  await t.mutation(internal.checklistExecution.saveEvidence, {
    itemId: second.itemId,
    runId: second.runId!,
    traceId: "c".repeat(32),
    result: {
      status: "unresolved",
      reason: "Provide a confirmed construction year.",
      missingInformation: [
        {
          field: "constructionYear",
          label: "Year",
          reason: "No matching record",
        },
      ],
      provenance: [],
    },
  });
  expect(
    await t.run((ctx) => ctx.db.get("checklistItems", first.itemId)),
  ).toMatchObject({ status: "done", notes: "Human note" });
  expect(
    await t.run((ctx) => ctx.db.get("checklistItems", second.itemId)),
  ).toMatchObject({ status: "pending", notes: "Human note" });
  const current = await states();
  expect(current[0]).toMatchObject({
    execution: "finished",
    finding: { constructionYear: 1940 },
  });
  expect(current[1]).toMatchObject({
    execution: "waiting",
    nextAction: "Provide a confirmed construction year.",
  });
});

test("human edit then revert cannot revive a run, and relevant context changes invalidate only affected items", async () => {
  const { t, staff, jobId, items, enqueue, drain, states } = await setup(2);
  await t.run((ctx) =>
    ctx.db.patch("checklistItems", items[1]._id, { title: "Air Quality" }),
  );
  const air = await t.run((ctx) => ctx.db.get("checklistItems", items[1]._id));
  await enqueue(items[0]);
  await enqueue(air!);
  await drain();
  const [yearState, airState] = await states();
  await staff.mutation(api.jobAgentContext.setConstructionYear, {
    jobId,
    year: 1985,
  });
  expect(
    await t.query(internal.checklistExecution.getRun, {
      itemId: yearState.itemId,
      runId: yearState.runId!,
    }),
  ).toBeNull();
  expect(
    await t.query(internal.checklistExecution.getRun, {
      itemId: airState.itemId,
      runId: airState.runId!,
    }),
  ).not.toBeNull();
  await staff.mutation(api.checklistItems.setNotes, {
    itemId: airState.itemId,
    notes: "Changed",
  });
  await staff.mutation(api.checklistItems.setNotes, {
    itemId: airState.itemId,
    notes: "Human note",
  });
  expect(
    await t.query(internal.checklistExecution.getRun, {
      itemId: airState.itemId,
      runId: airState.runId!,
    }),
  ).toBeNull();
  await staff.mutation(api.checklistExecution.retry, {
    itemId: airState.itemId,
  });
  expect((await states())[1].runId).toBe(airState.runId);
});

test("member removal and job deletion reject results and remove owned state and Agent threads", async () => {
  const {
    t,
    staff,
    staffId,
    staffMembershipId,
    jobId,
    items,
    enqueue,
    drain,
    states,
  } = await setup();

  await enqueue();
  await drain();
  const first = (await states())[0];
  await t.run(async (ctx) => {
    await ctx.db.patch("checklistAgentStates", first._id, {
      initiatedBy: staffId,
    });
    await ctx.db.patch("memberships", staffMembershipId, { state: "removed" });
  });
  expect(
    await t.query(internal.checklistExecution.getRun, {
      itemId: items[0]._id,
      runId: first.runId!,
    }),
  ).toBeNull();
  await t.run((ctx) =>
    ctx.db.patch("memberships", staffMembershipId, { state: "active" }),
  );
  await staff.mutation(api.jobs.remove, { jobId });
  expect(await states()).toEqual([]);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(
    await t.query(components.agent.threads.getThread, {
      threadId: first.threadId!,
    }),
  ).toBeNull();
  expect(
    await t.mutation(internal.checklistExecution.fail, {
      itemId: items[0]._id,
      runId: first.runId!,
      reason: "late_failure",
    }),
  ).toBe(false);
});

test("pre-thread dispatch failure is visible and stale queue recovery cannot overwrite a newer attempt", async () => {
  const { t, items, enqueue, states, staff } = await setup();
  expect(
    await t.mutation(internal.checklistExecution.dispatchFailed, {
      itemId: items[0]._id,
      classificationTraceId: "a".repeat(32),
    }),
  ).toBe(true);
  expect((await states())[0]).toMatchObject({
    execution: "failed",
    error: "dispatch_persistence_failed",
  });
  expect((await states())[0].threadId).toBeUndefined();
  await enqueue();
  const first = (await states())[0];
  vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000 + 1);
  await t.mutation(internal.checklistExecution.recoverQueue, {
    itemId: items[0]._id,
    queueAttempt: first.queueAttempt!,
  });
  expect((await states())[0]).toMatchObject({
    queued: false,
    execution: "failed",
    error: "queue_deadline_exceeded",
  });
  await staff.mutation(api.checklistExecution.retry, { itemId: items[0]._id });
  const retried = (await states())[0];
  expect(retried.queueAttempt).toBe(first.queueAttempt! + 1);
  await t.mutation(internal.checklistExecution.recoverQueue, {
    itemId: items[0]._id,
    queueAttempt: first.queueAttempt!,
  });
  expect((await states())[0]).toEqual(retried);
  expect(
    await t.mutation(internal.checklistExecution.dispatchFailed, {
      itemId: items[0]._id,
      classificationTraceId: "a".repeat(32),
    }),
  ).toBe(false);
});

test("job creation schedules full-record processing and manual edits never schedule classification", async () => {
  const { t, staff, items } = await setup();

  const categoryId = await t.run(async (ctx) => {
    const job = await ctx.db.get("jobs", items[0].jobId);

    return await ctx.db.insert("categories", {
      organizationId: job!.organizationId,
      title: "Carpentry",
      checklist: [{ title: "Air Quality", kind: "on_site" }],
    });
  });

  const jobId = await staff.mutation(api.jobs.create, {
    processedText: "Saved renovation",
    addressText: "Sample site",
    categoryId,
  });

  const scheduled = await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect(),
  );

  const processing = scheduled.filter((value) =>
    value.name.includes("processChecklist"),
  );

  expect(processing).toHaveLength(1);
  expect(processing[0].args[0]).toMatchObject({
    items: [
      {
        jobId,
        title: "Air Quality",
        status: "pending",
        notes: "",
        documentVersionIds: [],
      },
    ],
  });
  const item = processing[0].args[0].items[0];
  expect(item._creationTime).toBeTypeOf("number");
  await staff.mutation(api.checklistItems.setNotes, {
    itemId: item._id,
    notes: "Manual note",
  });
  await staff.mutation(api.checklistItems.setStatus, {
    itemId: item._id,
    status: "done",
  });

  const after = await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect(),
  );

  expect(
    after.filter((value) => value.name.includes("processChecklist")),
  ).toHaveLength(1);
});

test("automatic dispatch rejects job edits after classification while explicit retry uses the current context", async () => {
  const { t, jobId, enqueue, staff, items, states, drain } = await setup();
  await t.run((ctx) =>
    ctx.db.patch("jobs", jobId, { addressText: "Changed address" }),
  );
  expect(await enqueue()).toBe(false);
  expect((await states())[0].threadId).toBeUndefined();
  await staff.mutation(api.checklistExecution.retry, { itemId: items[0]._id });
  await drain();
  const state = (await states())[0];

  const run = await t.query(internal.checklistExecution.getRun, {
    itemId: items[0]._id,
    runId: state.runId!,
  });

  expect(run?.context.job.addressText).toBe("Changed address");
});

test("third-party execution claims one persistent thread and keeps checklist pending", async () => {
  const { t, items, enqueue, drain, states, staff } = await setup();

  const item = await t.run(async (ctx) => {
    await ctx.db.patch("checklistItems", items[0]._id, {
      kind: "third_party",
      title: "Building permit request",
    });
    const current = await ctx.db.get("checklistItems", items[0]._id);
    const context = await loadItemContext(ctx.db, current!);

    const state = await ctx.db
      .query("checklistAgentStates")
      .withIndex("by_itemId", (q) => q.eq("itemId", current!._id))
      .unique();

    await ctx.db.patch("checklistAgentStates", state!._id, {
      classification: {
        ...state!.classification,
        snapshot: classificationSnapshot(context!),
      },
    });

    return current!;
  });

  expect(await enqueue(item)).toBe(true);
  await staff.mutation(api.checklistExecution.retry, { itemId: item._id });
  await drain();
  expect((await states())[0].threadId).toBeDefined();
  expect((await states())[0].execution).toBe("running");
  expect(
    (await t.run((ctx) => ctx.db.get("checklistItems", item._id)))?.status,
  ).toBe("pending");
});

test("classification handoff recovery leaves acknowledged queued, running and completed work unchanged", async () => {
  const { t, items, enqueue, drain, states } = await setup();
  await t.run(async (ctx) => {
    const state = (await ctx.db.query("checklistAgentStates").take(1))[0];
    await ctx.db.patch("checklistAgentStates", state._id, {
      classification: {
        ...state.classification,
        runId: "handoff",
        dispatchPending: true,
      },
    });
  });
  await enqueue();

  for (const stage of ["queued", "running", "completed"]) {
    if (stage === "running") await drain();

    if (stage === "completed") {
      const state = (await states())[0];
      await t.mutation(internal.checklistExecution.saveEvidence, {
        itemId: items[0]._id,
        runId: state.runId!,
        traceId: "a".repeat(32),
        result: {
          status: "resolved",
          finding: {
            kind: "construction_year",
            summary: "1940",
            observedAt: Date.now(),
            address: "Site",
            constructionYear: 1940,
            pre1990: true,
            resolution: "live_api",
            lookupOutcome: "exact_match",
            coverage: "Historical record",
          },
          provenance: [],
        },
      });
    }

    const before = await states();
    await t.mutation(internal.checklistClassification.expire, {
      itemId: items[0]._id,
      runId: "handoff",
    });
    expect(await states()).toEqual(before);
  }
});
