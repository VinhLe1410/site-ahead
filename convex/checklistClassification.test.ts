/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import {
  normalizeItemClassifications,
  persistClassificationOutcome,
} from "./agents/checklist/itemClassification";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);

  const fixture = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Verifier" });

    const organizationId = await ctx.db.insert("organizations", {
      name: "Classification",
    });

    await ctx.db.insert("memberships", {
      userId,
      organizationId,
      role: "owner",
      state: "active",
    });

    const inputId = await ctx.db.insert("inputs", {
      organizationId,
      processedText: "Work",
      addressText: "Site",
    });

    const jobId = await ctx.db.insert("jobs", {
      organizationId,
      inputId,
      addressText: "Site",
      status: "pending",
    });

    const pendingId = await ctx.db.insert("checklistItems", {
      jobId,
      title: "Air Quality",
      status: "pending",
      kind: "third_party",
      notes: "Original note",
    });

    const doneId = await ctx.db.insert("checklistItems", {
      jobId,
      title: "Road Closure",
      status: "done",
      kind: "on_site",
      notes: "Human completed",
    });

    const items = await ctx.db
      .query("checklistItems")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .take(10);

    return { userId, jobId, pendingId, doneId, items };
  });

  return { t, ...fixture };
}

test("pending-only atomic claims preserve done items and reject duplicate claims", async () => {
  vi.useFakeTimers();

  try {
    const { t, userId, items, pendingId, doneId } = await setup();

    const args = {
      items,
      initiatedBy: userId,
      runId: "run-one",
      traceId: "a".repeat(32),
      spanId: "b".repeat(16),
    };

    const first = await t.mutation(
      internal.checklistClassification.claim,
      args,
    );

    const second = await t.mutation(internal.checklistClassification.claim, {
      ...args,
      runId: "run-two",
    });

    expect(first.map(({ item }) => item._id)).toEqual([pendingId]);
    expect(second).toEqual([]);
    await t.mutation(internal.checklistClassification.save, {
      itemId: pendingId,
      runId: "run-one",
      traceId: args.traceId,
      category: "automated",
    });
    expect(
      (await t.run((ctx) => ctx.db.get("checklistItems", pendingId)))?.kind,
    ).toBe("automated");
    expect(
      (await t.run((ctx) => ctx.db.get("checklistItems", doneId)))?.kind,
    ).toBe("on_site");

    const states = await t.run((ctx) =>
      ctx.db.query("checklistAgentStates").take(10),
    );

    expect(states).toHaveLength(1);
    expect(states[0].threadId).toBeUndefined();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
});

test("classification failures keep kind and retry without creating an execution thread", async () => {
  vi.useFakeTimers();

  try {
    const { t, userId, items, pendingId } = await setup();
    const traceId = "c".repeat(32);
    await t.mutation(internal.checklistClassification.claim, {
      items,
      initiatedBy: userId,
      runId: "failed-run",
      traceId,
      spanId: "d".repeat(16),
    });
    await t.mutation(internal.checklistClassification.save, {
      itemId: pendingId,
      runId: "failed-run",
      traceId,
      failure: "missing_model_classification",
    });
    expect(
      (await t.run((ctx) => ctx.db.get("checklistItems", pendingId)))?.kind,
    ).toBe("third_party");

    const state = await t.run((ctx) =>
      ctx.db
        .query("checklistAgentStates")
        .withIndex("by_itemId", (q) => q.eq("itemId", pendingId))
        .unique(),
    );

    expect(state?.classification).toMatchObject({
      status: "failed",
      traceId,
      error: "missing_model_classification",
    });
    expect(state?.threadId).toBeUndefined();

    const retried = await t.mutation(internal.checklistClassification.claim, {
      items,
      initiatedBy: userId,
      runId: "retry",
      traceId,
      spanId: "d".repeat(16),
    });

    expect(retried).toHaveLength(1);
    expect(
      await t.mutation(internal.checklistClassification.save, {
        itemId: pendingId,
        runId: "failed-run",
        traceId,
        category: "on_site",
      }),
    ).toBe(false);
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const expired = await t.run((ctx) =>
      ctx.db
        .query("checklistAgentStates")
        .withIndex("by_itemId", (q) => q.eq("itemId", pendingId))
        .unique(),
    );

    expect(expired?.error).toBe("classification_deadline_exceeded");
  } finally {
    vi.useRealTimers();
  }
});

test("human notes changed during classification invalidate its result", async () => {
  vi.useFakeTimers();

  try {
    const { t, userId, items, pendingId } = await setup();
    await t.mutation(internal.checklistClassification.claim, {
      items,
      initiatedBy: userId,
      runId: "run",
      traceId: "e".repeat(32),
      spanId: "f".repeat(16),
    });
    await t.run((ctx) =>
      ctx.db.patch("checklistItems", pendingId, { notes: "Human revision" }),
    );
    expect(
      await t.mutation(internal.checklistClassification.save, {
        itemId: pendingId,
        runId: "run",
        traceId: "e".repeat(32),
        category: "automated",
      }),
    ).toBe(false);
    expect(
      await t.run((ctx) => ctx.db.get("checklistItems", pendingId)),
    ).toMatchObject({
      kind: "third_party",
      notes: "Human revision",
      status: "pending",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
});

test("missing, invalid, duplicate and model-error classifications are excluded, never normalized to on-site", () => {
  const items = [
    { id: "a", item: "A" },
    { id: "b", item: "B" },
    { id: "c", item: "C" },
  ];

  const result = normalizeItemClassifications(items, [
    { id: "a", category: "automated" },
    { id: "a", category: "on_site" },
    { id: "b", category: "invalid" },
  ]);

  expect(result.classifications).toEqual([]);
  expect(result.failures.map((failure) => failure.reason)).toEqual([
    "duplicate_model_classification",
    "invalid_model_category",
    "missing_model_classification",
  ]);
  expect(
    normalizeItemClassifications(items, [], "model_output_error").failures,
  ).toHaveLength(3);
});

test("parent reruns reclassify pending items while preserving prior execution output", async () => {
  vi.useFakeTimers();

  try {
    const { t, userId, items, pendingId } = await setup();
    const traceId = "a".repeat(32);
    await t.mutation(internal.checklistClassification.claim, {
      items,
      initiatedBy: userId,
      runId: "initial",
      traceId,
      spanId: "b".repeat(16),
    });
    await t.mutation(internal.checklistClassification.save, {
      itemId: pendingId,
      runId: "initial",
      traceId,
      category: "third_party",
    });
    await t.run(async (ctx) => {
      const state = await ctx.db
        .query("checklistAgentStates")
        .withIndex("by_itemId", (q) => q.eq("itemId", pendingId))
        .unique();

      if (state === null) throw new Error("Missing state");
      await ctx.db.patch("checklistAgentStates", state._id, {
        threadId: "persistent-thread",
        execution: "waiting",
        runId: "execution-run",
        snapshot: "execution-snapshot",
        initiatedBy: userId,
        currentStep: "review",
        nextAction: "Review the draft",
        provenance: [
          { source: "saved-job", method: "database", observedAt: 1000 },
        ],
      });
    });

    const currentItems = await t.run((ctx) =>
      ctx.db
        .query("checklistItems")
        .withIndex("by_jobId", (q) => q.eq("jobId", items[0].jobId))
        .take(10),
    );

    expect(
      await t.mutation(internal.checklistClassification.claim, {
        items: currentItems,
        initiatedBy: userId,
        runId: "rerun",
        traceId,
        spanId: "c".repeat(16),
      }),
    ).toHaveLength(1);
    await t.mutation(internal.checklistClassification.save, {
      itemId: pendingId,
      runId: "rerun",
      traceId,
      category: "automated",
    });

    const state = await t.run((ctx) =>
      ctx.db
        .query("checklistAgentStates")
        .withIndex("by_itemId", (q) => q.eq("itemId", pendingId))
        .unique(),
    );

    expect(state).toMatchObject({
      threadId: "persistent-thread",
      execution: "waiting",
      runId: "execution-run",
      snapshot: "execution-snapshot",
      currentStep: "review",
      nextAction: "Review the draft",
      provenance: [
        { source: "saved-job", method: "database", observedAt: 1000 },
      ],
      classification: { status: "succeeded", runId: "rerun" },
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
});

test("one item persistence failure cannot prevent later item outcomes", async () => {
  const outcomes = [];

  for (const item of ["unavailable", "healthy"]) {
    outcomes.push(
      await persistClassificationOutcome(async () => {
        if (item === "unavailable")
          throw new Error("Storage unavailable for this item");

        return true;
      }, "automated"),
    );
  }

  expect(outcomes).toEqual([
    { saved: false, persistenceFailed: true },
    { saved: true, persistenceFailed: false },
  ]);
});
