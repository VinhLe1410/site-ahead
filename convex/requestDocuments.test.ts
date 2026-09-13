/// <reference types="vite/client" />
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { convexTest } from "convex-test";
import agentTest from "@convex-dev/agent/test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { loadItemContext } from "./jobAgentContext";
import { classificationSnapshot, itemAgentState } from "./itemAgentData";
import { requestSkills } from "./agents/requests/requestSkills";
import { fillBuildingPermitPdf } from "./agents/requests/buildingPermitPdf";

const modules = import.meta.glob("./**/*.ts");

const originals = await Promise.all(
  requestSkills.map((skill) =>
    readFile(`tests/fixtures/request-forms/${skill.sourceFilename}`),
  ),
);

// Render before replacing timers: pdf-lib yields through real scheduling while
// the Convex state-machine tests deliberately keep scheduled workers pending.
const output = await fillBuildingPermitPdf(originals[0], {
  addressText: "123 Collins Street, Melbourne VIC 3000",
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function setup() {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  agentTest.register(t);

  const fixture = await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      name: "Request fixtures",
    });

    const otherOrg = await ctx.db.insert("organizations", { name: "Other" });
    const userId = await ctx.db.insert("users", { name: "Owner" });
    const staffId = await ctx.db.insert("users", { name: "Staff" });
    const otherId = await ctx.db.insert("users", { name: "Other" });
    await ctx.db.insert("memberships", {
      organizationId,
      userId,
      role: "owner",
      state: "active",
    });

    const staffMembershipId = await ctx.db.insert("memberships", {
      organizationId,
      userId: staffId,
      role: "staff",
      state: "active",
    });

    await ctx.db.insert("memberships", {
      organizationId: otherOrg,
      userId: otherId,
      role: "owner",
      state: "active",
    });
    const versions = [];

    for (const [index, skill] of requestSkills.entries()) {
      const storageId = await ctx.storage.store(
        new Blob([Uint8Array.from(originals[index])], {
          type: skill.contentType,
        }),
      );

      const documentId = await ctx.db.insert("documents", {
        organizationId,
        title: skill.name,
        description: "Fixture",
        searchText: skill.name,
        archived: false,
        currentVersion: 1,
      });

      const versionId = await ctx.db.insert("documentVersions", {
        documentId,
        number: 1,
        storageId,
        filename: skill.sourceFilename,
        size: originals[index].length,
        contentType: skill.contentType,
        uploadedBy: userId,
      });

      versions.push({ versionId, formKey: skill.key, documentId, storageId });
    }

    const inputId = await ctx.db.insert("inputs", {
      organizationId,
      addressText: "123 Collins Street, Melbourne VIC 3000",
      processedText: "Carpentry renovation",
    });

    const categoryId = await ctx.db.insert("categories", {
      organizationId,
      title: "Carpentry & Renovation",
      checklist: [],
    });

    const jobId = await ctx.db.insert("jobs", {
      organizationId,
      inputId,
      categoryId,
      addressText: "123 Collins Street, Melbourne VIC 3000",
      status: "pending",
    });

    const itemId = await ctx.db.insert("checklistItems", {
      jobId,
      kind: "third_party",
      title: "Building permit request",
      status: "pending",
      notes: "Human note",
      documentVersionIds: [versions[0].versionId],
    });

    const item = await ctx.db.get("checklistItems", itemId);

    if (!item) throw new Error("Fixture missing");
    const context = await loadItemContext(ctx.db, item);

    if (!context) throw new Error("Fixture context missing");
    await ctx.db.insert("checklistAgentStates", {
      itemId,
      jobId,
      classification: {
        status: "succeeded",
        traceId: "a".repeat(32),
        spanId: "b".repeat(16),
        snapshot: classificationSnapshot(context),
      },
      execution: "idle",
      currentStep: "ready",
      updatedAt: Date.now(),
      provenance: [],
      missingInformation: [],
      nextAction: "Ready",
    });

    return {
      organizationId,
      userId,
      staffId,
      otherId,
      staffMembershipId,
      jobId,
      item,
      versions,
    };
  });

  await t.mutation(internal.requestDocuments.registerSources, {
    organizationId: fixture.organizationId,
    versions: fixture.versions.map(({ versionId, formKey }) => ({
      versionId,
      formKey,
    })),
  });

  const state = async () =>
    await t.run((ctx) => itemAgentState(ctx.db, fixture.item._id));

  const start = async () => {
    await t.mutation(internal.checklistExecution.enqueue, {
      item: fixture.item,
      initiatedBy: fixture.userId,
      classificationTraceId: "a".repeat(32),
    });
    await t.mutation(internal.checklistExecution.drain, {
      jobId: fixture.jobId,
    });
    const current = await state();

    if (!current?.runId) throw new Error("Run missing");

    return { itemId: fixture.item._id, runId: current.runId };
  };

  const candidate = async () => {
    const storageId = await t.run((ctx) =>
      ctx.storage.store(
        new Blob([Uint8Array.from(output.bytes)], { type: "application/pdf" }),
      ),
    );

    return {
      storageId,
      sha256: createHash("sha256").update(output.bytes).digest("hex"),
      sourceSha256: output.sourceSha256,
      sourceVersionId: fixture.versions[0].versionId,
      formKey: "building-permit-request" as const,
      traceId: "c".repeat(32),
    };
  };

  return {
    t,
    ...fixture,
    state,
    start,
    candidate,
    staff: t.withIdentity({ subject: `${fixture.staffId}|session` }),
    other: t.withIdentity({ subject: `${fixture.otherId}|session` }),
  };
}

test("request save stays pending, derives demo provenance, supports same-thread staff retry and scoped downloads", async () => {
  const f = await setup();
  const run = await f.start();
  const candidate = await f.candidate();
  const threadId = (await f.state())?.threadId;
  expect(
    await f.t.mutation(internal.requestDocuments.saveDraft, {
      ...run,
      ...candidate,
    }),
  ).toBe(true);
  const state = await f.state();
  expect(state).toMatchObject({
    execution: "waiting",
    currentStep: "waiting",
    draft: {
      sourceVersionId: f.versions[0].versionId,
      storageId: candidate.storageId,
    },
  });
  expect(state?.provenance.some((entry) => entry.method === "demo_data")).toBe(
    true,
  );
  expect(
    await f.t.run((ctx) => ctx.db.get("checklistItems", f.item._id)),
  ).toMatchObject({ status: "pending", notes: "Human note" });
  expect(
    await f.staff.query(internal.requestDocuments.downloadContext, {
      itemId: f.item._id,
    }),
  ).toMatchObject({ storageId: candidate.storageId });
  await expect(
    f.other.query(internal.requestDocuments.downloadContext, {
      itemId: f.item._id,
    }),
  ).rejects.toThrow();
  await expect(
    f.t.query(internal.requestDocuments.downloadContext, {
      itemId: f.item._id,
    }),
  ).rejects.toThrow();
  const response = await f.staff.fetch(`/documents/draft?itemId=${f.item._id}`);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("Content-Disposition")).toContain("DEMO-DRAFT");
  expect(
    createHash("sha256")
      .update(new Uint8Array(await response.arrayBuffer()))
      .digest("hex"),
  ).toBe(candidate.sha256);
  expect(
    (await f.other.fetch(`/documents/draft?itemId=${f.item._id}`)).status,
  ).toBe(403);
  expect(
    (await f.t.fetch(`/documents/draft?itemId=${f.item._id}`)).status,
  ).toBe(401);
  await f.staff.mutation(api.checklistExecution.retry, { itemId: f.item._id });
  await f.t.mutation(internal.checklistExecution.drain, { jobId: f.jobId });
  expect((await f.state())?.threadId).toBe(threadId);
  expect((await f.state())?.runId).not.toBe(run.runId);
  const next = await f.candidate();
  const nextState = await f.state();

  if (!nextState?.runId) throw new Error("Run missing");
  await f.t.mutation(internal.requestDocuments.saveDraft, {
    itemId: f.item._id,
    runId: nextState.runId,
    ...next,
  });
  expect(
    await f.t.run(
      async (ctx) => (await ctx.storage.get(candidate.storageId)) !== null,
    ),
  ).toBe(false);
  expect(
    await f.t.run(
      async (ctx) => (await ctx.storage.get(f.versions[0].storageId)) !== null,
    ),
  ).toBe(true);
});

test("pinned source survives library replacement, mismatched skills and cross-org source access are rejected", async () => {
  const f = await setup();
  const run = await f.start();
  await f.t.run(async (ctx) => {
    const version = await ctx.db.get(
      "documentVersions",
      f.versions[0].versionId,
    );

    if (!version) throw new Error("Version missing");
    await ctx.db.insert("documentVersions", {
      documentId: version.documentId,
      number: 2,
      storageId: version.storageId,
      filename: "Replacement.pdf",
      contentType: version.contentType,
      size: version.size,
      uploadedBy: version.uploadedBy,
    });
    await ctx.db.patch("documents", version.documentId, { currentVersion: 2 });
  });
  expect(
    (
      await f.t.query(internal.requestDocuments.source, {
        ...run,
        formKey: "building-permit-request",
      })
    )._id,
  ).toBe(f.versions[0].versionId);
  await expect(
    f.t.query(internal.requestDocuments.source, {
      ...run,
      formKey: "occupancy-inspection-request",
    }),
  ).rejects.toThrow("request_skill_item_mismatch");
  await f.t.run(async (ctx) => {
    const otherOrg = await ctx.db.insert("organizations", {
      name: "Wrong source org",
    });

    await ctx.db.patch("documents", f.versions[0].documentId, {
      organizationId: otherOrg,
    });
  });
  await expect(
    f.t.query(internal.requestDocuments.source, {
      ...run,
      formKey: "building-permit-request",
    }),
  ).rejects.toThrow("request_source_access_denied");
});

test("stale human edits reject saves and cleanup removes only the new candidate", async () => {
  const f = await setup();
  const run = await f.start();
  const candidate = await f.candidate();
  await f.t.run((ctx) =>
    ctx.db.patch("jobs", f.jobId, { addressText: "Human changed address" }),
  );
  await expect(
    f.t.mutation(internal.requestDocuments.saveDraft, { ...run, ...candidate }),
  ).rejects.toThrow("saved_context_changed");
  await f.t.mutation(internal.requestDocuments.discardCandidate, {
    itemId: f.item._id,
    storageId: candidate.storageId,
  });
  expect(
    await f.t.run(
      async (ctx) => (await ctx.storage.get(candidate.storageId)) !== null,
    ),
  ).toBe(false);
  await f.t.mutation(internal.requestDocuments.discardCandidate, {
    itemId: f.item._id,
    storageId: f.versions[0].storageId,
  });
  expect(
    await f.t.run(
      async (ctx) => (await ctx.storage.get(f.versions[0].storageId)) !== null,
    ),
  ).toBe(true);
  expect((await f.state())?.draft).toBeUndefined();
});

test("lost-response duplicate save and cleanup retain the accepted draft; removed staff lose access", async () => {
  const f = await setup();
  const run = await f.start();
  const candidate = await f.candidate();
  await f.t.mutation(internal.requestDocuments.saveDraft, {
    ...run,
    ...candidate,
  });
  await f.t.mutation(internal.requestDocuments.saveDraft, {
    ...run,
    ...candidate,
  });
  await f.t.mutation(internal.requestDocuments.discardCandidate, {
    itemId: f.item._id,
    storageId: candidate.storageId,
  });
  expect(
    await f.t.run(
      async (ctx) => (await ctx.storage.get(candidate.storageId)) !== null,
    ),
  ).toBe(true);
  await f.t.run((ctx) =>
    ctx.db.patch("memberships", f.staffMembershipId, { state: "removed" }),
  );
  await expect(
    f.staff.query(internal.requestDocuments.downloadContext, {
      itemId: f.item._id,
    }),
  ).rejects.toThrow();
});

test("unsupported pinned source fails before any model call and deletion removes drafts but keeps library originals", async () => {
  const f = await setup();
  const run = await f.start();
  await f.t.run((ctx) =>
    ctx.db.patch("documentVersions", f.versions[0].versionId, {
      formKey: undefined,
    }),
  );
  await f.t.action(internal.agents.requests.requestWorker.run, {
    item: f.item,
    runId: run.runId,
  });
  expect(await f.state()).toMatchObject({
    execution: "failed",
    error: "request_pinned_source_missing",
  });
  await f.t.mutation(internal.requestDocuments.registerSources, {
    organizationId: f.organizationId,
    versions: f.versions.map(({ versionId, formKey }) => ({
      versionId,
      formKey,
    })),
  });
  await f.staff.mutation(api.checklistExecution.retry, { itemId: f.item._id });
  await f.t.mutation(internal.checklistExecution.drain, { jobId: f.jobId });
  const state = await f.state();

  if (!state?.runId) throw new Error("Run missing");
  const candidate = await f.candidate();
  await f.t.mutation(internal.requestDocuments.saveDraft, {
    itemId: f.item._id,
    runId: state.runId,
    ...candidate,
  });
  await f.staff.mutation(api.jobs.remove, { jobId: f.jobId });
  expect(await f.state()).toBeNull();
  expect(
    await f.t.run(
      async (ctx) => (await ctx.storage.get(candidate.storageId)) !== null,
    ),
  ).toBe(false);
  expect(
    await f.t.run(
      async (ctx) => (await ctx.storage.get(f.versions[0].storageId)) !== null,
    ),
  ).toBe(true);
});
