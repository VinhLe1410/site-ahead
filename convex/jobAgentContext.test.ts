/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadPreparationContext } from "./jobPreparationContext";
import {
  clientMessageSnapshot,
  composeClientMessage,
  PREPARATION_PROMPT_VERSION,
} from "./preparationContracts";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function setup() {
  const t = convexTest(schema, modules);

  const records = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", { name: "Owner" });
    const staffId = await ctx.db.insert("users", { name: "Staff" });
    const outsiderId = await ctx.db.insert("users", { name: "Other" });

    const organizationId = await ctx.db.insert("organizations", {
      name: "Demo",
    });

    const otherOrganizationId = await ctx.db.insert("organizations", {
      name: "Other",
    });

    await ctx.db.insert("memberships", {
      userId: ownerId,
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
      userId: outsiderId,
      organizationId: otherOrganizationId,
      role: "owner",
      state: "active",
    });

    const inputId = await ctx.db.insert("inputs", {
      organizationId,
      processedText: "Renovation",
      addressText: "123 Sample Road",
    });

    const categoryId = await ctx.db.insert("categories", {
      organizationId,
      title: "Carpentry & Renovation",
      checklist: [],
    });

    const jobId = await ctx.db.insert("jobs", {
      categoryId,
      organizationId,
      inputId,
      addressText: "123 Sample Road",
      status: "pending",
    });

    const itemId = await ctx.db.insert("checklistItems", {
      jobId,
      title: "Construction year",
      kind: "automated",
      status: "pending",
      notes: "Keep this note",
    });

    const job = await ctx.db.get("jobs", jobId);

    if (!job) throw new Error("Fixture job missing");
    const context = await loadPreparationContext(ctx.db, job);

    const entries = [
      {
        id: "preparation-question",
        action: "Request existing plans",
        rationale: "Prepare the renovation visit",
        excerpt: "Renovation",
        clientQuestion: "Could you share existing plans?",
        status: "pending" as const,
        contextFingerprint: context.fingerprint,
      },
    ];

    const preparationId = await ctx.db.insert("jobPreparations", {
      jobId,
      entries,
      generation: "succeeded",
      revision: 0,
      contextFingerprint: context.fingerprint,
      promptVersion: PREPARATION_PROMPT_VERSION,
      dismissedActions: [],
      dismissedContextFingerprint: context.fingerprint,
      message: {
        text: composeClientMessage(entries),
        sourceSnapshot: clientMessageSnapshot(entries, context.fingerprint),
        revision: 1,
        edited: false,
      },
    });

    return {
      ownerId,
      staffId,
      outsiderId,
      staffMembershipId,
      jobId,
      itemId,
      inputId,
      preparationId,
    };
  });

  return {
    t,
    ...records,
    staff: t.withIdentity({ subject: `${records.staffId}|session` }),
    outsider: t.withIdentity({ subject: `${records.outsiderId}|session` }),
  };
}

describe("confirmed job context", () => {
  test("staff can save and clear a year with server-derived attribution without dispatching", async () => {
    const { t, staff, staffId, jobId, itemId } = await setup();
    const before = Date.now();
    await staff.mutation(api.jobAgentContext.setConstructionYear, {
      jobId,
      year: 1985,
    });

    const context = await t.query(internal.jobAgentContext.get, {
      itemId,
      initiatedBy: staffId,
    });

    expect(context?.job.confirmedConstructionYear).toMatchObject({
      year: 1985,
      suppliedBy: staffId,
    });
    expect(
      context?.job.confirmedConstructionYear?.suppliedAt,
    ).toBeGreaterThanOrEqual(before);
    expect(context?.item).toMatchObject({
      status: "pending",
      notes: "Keep this note",
    });
    expect(context?.item._creationTime).toBeTypeOf("number");
    expect(
      await t.run((ctx) => ctx.db.query("checklistAgentStates").take(1)),
    ).toEqual([]);
    await staff.mutation(api.jobAgentContext.setConstructionYear, {
      jobId,
      year: null,
    });
    expect(
      (
        await t.query(internal.jobAgentContext.get, {
          itemId,
          initiatedBy: staffId,
        })
      )?.job.confirmedConstructionYear,
    ).toBeUndefined();
  });

  test("invalid years do not replace a previously confirmed year", async () => {
    const { t, staff, staffId, jobId, itemId } = await setup();
    await staff.mutation(api.jobAgentContext.setConstructionYear, {
      jobId,
      year: 1985,
    });

    for (const year of [
      1799,
      1985.5,
      new Date().getUTCFullYear() + 1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])
      await expect(
        staff.mutation(api.jobAgentContext.setConstructionYear, {
          jobId,
          year,
        }),
      ).rejects.toThrow("Construction year");
    expect(
      (
        await t.query(internal.jobAgentContext.get, {
          itemId,
          initiatedBy: staffId,
        })
      )?.job.confirmedConstructionYear?.year,
    ).toBe(1985);
  });

  test("other organizations, signed-out callers and removed members cannot change context", async () => {
    const { t, staff, outsider, staffId, staffMembershipId, jobId, itemId } =
      await setup();

    expect(await outsider.query(api.jobPreparation.get, { jobId })).toBeNull();
    await expect(t.query(api.jobPreparation.get, { jobId })).rejects.toThrow(
      "Not authenticated",
    );
    await expect(
      outsider.mutation(api.jobPreparation.setStatus, {
        jobId,
        entryId: "preparation-question",
        status: "done",
      }),
    ).rejects.toThrow("Job not found");

    await expect(
      outsider.mutation(api.jobAgentContext.setConstructionYear, {
        jobId,
        year: 1985,
      }),
    ).rejects.toThrow("Job not found");
    await expect(
      t.mutation(api.jobAgentContext.setConstructionYear, {
        jobId,
        year: 1985,
      }),
    ).rejects.toThrow("Not authenticated");
    await t.run((ctx) =>
      ctx.db.patch("memberships", staffMembershipId, { state: "removed" }),
    );
    await expect(
      staff.mutation(api.jobAgentContext.setConstructionYear, {
        jobId,
        year: 1985,
      }),
    ).rejects.toThrow("Organization access");
    expect(await staff.query(api.jobPreparation.get, { jobId })).toBeNull();
    await expect(
      staff.mutation(api.jobPreparation.setStatus, {
        jobId,
        entryId: "preparation-question",
        status: "done",
      }),
    ).rejects.toThrow("Organization access");
    expect(
      await t.query(internal.jobAgentContext.get, {
        itemId,
        initiatedBy: staffId,
      }),
    ).toBeNull();
  });

  test("location and request fields require bounded confirmed values", async () => {
    const { t, staff, staffId, jobId, itemId } = await setup();
    await expect(
      staff.mutation(api.jobAgentContext.setFields, {
        jobId,
        fields: { latitude: -37.81 },
      }),
    ).rejects.toThrow("both latitude");
    await expect(
      staff.mutation(api.jobAgentContext.setFields, {
        jobId,
        fields: { latitude: 91, longitude: 144.96 },
      }),
    ).rejects.toThrow("latitude within Victoria");
    await expect(
      staff.mutation(api.jobAgentContext.setFields, {
        jobId,
        fields: { plannedStartDate: "2026-02-30" },
      }),
    ).rejects.toThrow("valid planned start");
    await expect(
      staff.mutation(api.jobAgentContext.setFields, {
        jobId,
        fields: { clientName: "x".repeat(501) },
      }),
    ).rejects.toThrow("500 characters");
    await staff.mutation(api.jobAgentContext.setFields, {
      jobId,
      fields: {
        latitude: -37.81,
        longitude: 144.96,
        contractorName: " Demo Contractor ",
        plannedStartDate: "2026-10-01",
      },
    });
    expect(
      (
        await t.query(internal.jobAgentContext.get, {
          itemId,
          initiatedBy: staffId,
        })
      )?.job.agentContext,
    ).toMatchObject({
      contractorName: "Demo Contractor",
      suppliedBy: staffId,
      latitude: -37.81,
    });
  });
});

async function claimFixture(
  fixture: Awaited<ReturnType<typeof setup>>,
  initialRetryAvailable = false,
) {
  return await fixture.t.run(async (ctx) => {
    const job = await ctx.db.get("jobs", fixture.jobId);
    const record = await ctx.db.get("jobPreparations", fixture.preparationId);

    if (!job || !record) throw new Error("Fixture missing");
    const context = await loadPreparationContext(ctx.db, job);

    const run = {
      id: "verification-run",
      initiatedBy: fixture.staffId,
      revision: record.revision,
      contextFingerprint: context.fingerprint,
      authoritativeFingerprint: context.authoritativeFingerprint,
      deadlineAt: Date.now() + 90_000,
      initialRetryAvailable,
    };

    await ctx.db.patch("jobPreparations", record._id, {
      generation: "running",
      run,
    });

    return { jobId: fixture.jobId, runId: run.id };
  });
}

const generatedPreparation = [
  {
    action: "Clarify renovation scope",
    rationale: "Prepare for this renovation visit",
    excerpt: "Renovation",
    clientQuestion: "What renovation work is planned?",
  },
];

describe("preparation shares job access and protects human decisions", () => {
  test("completion and editable messages persist without changing the checklist, and revisions reject concurrent edits", async () => {
    const fixture = await setup();
    const { t, staff, jobId, itemId } = fixture;
    await staff.mutation(api.jobPreparation.saveMessage, {
      jobId,
      text: "My edited client message",
      expectedRevision: 1,
    });
    await expect(
      staff.mutation(api.jobPreparation.saveMessage, {
        jobId,
        text: "Overwriting stale edit",
        expectedRevision: 1,
      }),
    ).rejects.toThrow("saved message changed");
    const run = await claimFixture(fixture);
    expect(
      await t.mutation(internal.jobPreparationGeneration.finish, {
        ...run,
        suggestions: generatedPreparation,
      }),
    ).toBe("saved");
    const refreshed = await staff.query(api.jobPreparation.get, { jobId });
    expect(refreshed?.record?.message?.text).toBe("My edited client message");
    expect(refreshed?.messageStale).toBe(true);
    const entryId = refreshed?.record?.entries[0]?.id;

    if (!entryId) throw new Error("Expected generated item");
    await staff.mutation(api.jobPreparation.setStatus, {
      jobId,
      entryId,
      status: "done",
    });
    await staff.mutation(api.jobPreparation.regenerateMessage, {
      jobId,
      expectedRevision: 2,
    });
    const completed = await staff.query(api.jobPreparation.get, { jobId });
    expect(completed?.record?.message?.text).toBeNull();
    expect(completed?.record?.entries[0]?.status).toBe("done");

    const otherMember = t.withIdentity({
      subject: `${fixture.ownerId}|other-session`,
    });

    expect(
      (await otherMember.query(api.jobPreparation.get, { jobId }))?.record
        ?.entries[0]?.status,
    ).toBe("done");
    expect(
      await t.run((ctx) => ctx.db.get("checklistItems", itemId)),
    ).toMatchObject({ status: "pending", notes: "Keep this note" });
    expect(await t.run((ctx) => ctx.db.get("jobs", jobId))).toMatchObject({
      status: "pending",
    });
    await staff.mutation(api.jobPreparation.setStatus, {
      jobId,
      entryId,
      status: "pending",
    });
    await staff.mutation(api.jobPreparation.setStatus, {
      jobId,
      entryId,
      status: "dismissed",
    });
    const dismissed = await staff.query(api.jobPreparation.get, { jobId });
    expect(dismissed?.record?.dismissedActions).toContain(
      "Clarify renovation scope",
    );
    await staff.mutation(api.jobPreparation.regenerateMessage, {
      jobId,
      expectedRevision: 3,
    });
    expect(
      (await staff.query(api.jobPreparation.get, { jobId }))?.record?.message
        ?.text,
    ).toBeNull();
  });

  test("description edits and manual decisions reject late output while preserving previous work", async () => {
    const fixture = await setup();
    const run = await claimFixture(fixture, true);
    await fixture.t.run((ctx) =>
      ctx.db.patch("inputs", fixture.inputId, {
        processedText: "Changed renovation scope",
      }),
    );
    expect(
      await fixture.t.mutation(internal.jobPreparationGeneration.finish, {
        ...run,
        suggestions: generatedPreparation,
      }),
    ).toBe("discarded");

    const stale = await fixture.staff.query(api.jobPreparation.get, {
      jobId: fixture.jobId,
    });

    expect(stale?.stale).toBe(true);
    expect(stale?.messageStale).toBe(true);
    expect(stale?.record?.entries[0]?.id).toBe("preparation-question");
    const nextRun = await claimFixture(fixture);
    await fixture.staff.mutation(api.jobPreparation.setStatus, {
      jobId: fixture.jobId,
      entryId: "preparation-question",
      status: "done",
    });
    expect(
      await fixture.t.mutation(internal.jobPreparationGeneration.finish, {
        ...nextRun,
        suggestions: generatedPreparation,
      }),
    ).toBe("discarded");
    expect(
      (
        await fixture.staff.query(api.jobPreparation.get, {
          jobId: fixture.jobId,
        })
      )?.record?.entries[0]?.status,
    ).toBe("done");
  });

  test("one initial evidence retry is bounded and completed tasks retain their original grounding", async () => {
    const fixture = await setup();
    await fixture.staff.mutation(api.jobPreparation.setStatus, {
      jobId: fixture.jobId,
      entryId: "preparation-question",
      status: "done",
    });
    const run = await claimFixture(fixture, true);
    await fixture.t.run((ctx) =>
      ctx.db.patch("checklistItems", fixture.itemId, { status: "done" }),
    );
    expect(
      await fixture.t.mutation(internal.jobPreparationGeneration.finish, {
        ...run,
        suggestions: generatedPreparation,
      }),
    ).toBe("retrying");

    const retry = (
      await fixture.staff.query(api.jobPreparation.get, {
        jobId: fixture.jobId,
      })
    )?.record?.run;

    if (!retry) throw new Error("Expected bounded retry");
    expect(retry.initialRetryAvailable).toBe(false);
    expect(
      await fixture.t.mutation(internal.jobPreparationGeneration.finish, {
        jobId: fixture.jobId,
        runId: retry.id,
        suggestions: generatedPreparation,
      }),
    ).toBe("saved");

    const result = await fixture.staff.query(api.jobPreparation.get, {
      jobId: fixture.jobId,
    });

    expect(result?.record?.entries).toHaveLength(2);
    expect(result?.record?.entries[0]?.status).toBe("done");
    expect(result?.staleEntryIds).toContain("preparation-question");
    expect(result?.stale).toBe(false);
  });

  test("failure preserves saved work, expiry permits retry, and lost membership or deletion reject late saves", async () => {
    const fixture = await setup();
    let run = await claimFixture(fixture);
    expect(
      await fixture.t.mutation(internal.jobPreparationGeneration.finish, {
        ...run,
        failure: "provider",
      }),
    ).toBe("failed");
    expect(
      (
        await fixture.staff.query(api.jobPreparation.get, {
          jobId: fixture.jobId,
        })
      )?.record?.entries[0]?.id,
    ).toBe("preparation-question");
    run = await claimFixture(fixture);
    vi.setSystemTime(Date.now() + 90_001);
    await fixture.t.mutation(internal.jobPreparationGeneration.expire, run);
    expect(
      (
        await fixture.staff.query(api.jobPreparation.get, {
          jobId: fixture.jobId,
        })
      )?.record?.generation,
    ).toBe("failed");
    await fixture.staff.mutation(api.jobPreparationGeneration.start, {
      jobId: fixture.jobId,
    });
    expect(
      (
        await fixture.staff.query(api.jobPreparation.get, {
          jobId: fixture.jobId,
        })
      )?.record?.run?.id,
    ).not.toBe(run.runId);
    expect(
      await fixture.t.mutation(internal.jobPreparationGeneration.finish, {
        ...run,
        suggestions: generatedPreparation,
      }),
    ).toBe("discarded");
    run = await claimFixture(fixture);
    await fixture.t.run((ctx) =>
      ctx.db.patch("memberships", fixture.staffMembershipId, {
        state: "removed",
      }),
    );
    expect(
      await fixture.t.mutation(internal.jobPreparationGeneration.finish, {
        ...run,
        suggestions: generatedPreparation,
      }),
    ).toBe("discarded");
    await fixture.t.run((ctx) =>
      ctx.db.patch("memberships", fixture.staffMembershipId, {
        state: "active",
      }),
    );
    run = await claimFixture(fixture);
    await fixture.staff.mutation(api.jobs.remove, { jobId: fixture.jobId });
    expect(
      await fixture.t.mutation(internal.jobPreparationGeneration.finish, {
        ...run,
        suggestions: generatedPreparation,
      }),
    ).toBe("discarded");
    expect(
      await fixture.t.run((ctx) =>
        ctx.db.get("jobPreparations", fixture.preparationId),
      ),
    ).toBeNull();
    expect(
      await fixture.staff.query(api.jobPreparation.get, {
        jobId: fixture.jobId,
      }),
    ).toBeNull();
  });
});
