import { ConvexError, v, type Infer } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { schema } from "./schema";
import {
  agentDraftValidator,
  agentProvenanceValidator,
  formKeyValidator,
} from "./agentContracts";
import { requireMembership, requireOrganizationChecklistItem } from "./access";
import { loadExecutionRun } from "./checklistExecution";
import { itemAgentState } from "./itemAgentData";
import {
  requestKind,
  requestSkill,
  requestValues,
} from "./agents/requests/requestSkills";

const runArgs = { itemId: v.id("checklistItems"), runId: v.string() };

export function storageHashToHex(base64: string) {
  return Array.from(atob(base64), (character) =>
    character.charCodeAt(0).toString(16).padStart(2, "0"),
  ).join("");
}

async function sourceForRun(
  ctx: QueryCtx,
  args: { itemId: Id<"checklistItems">; runId: string; formKey: string },
) {
  const run = await loadExecutionRun(ctx, args);
  const skill = requestSkill(args.formKey);

  if (run === null) throw new ConvexError("saved_context_changed");

  if (
    run.context.item.kind !== "third_party" ||
    skill === null ||
    requestKind(run.context.item.title, run.context.category?.title) !==
      skill.key
  )
    throw new ConvexError("request_skill_item_mismatch");
  const matches = [];

  for (const versionId of run.context.item.documentVersionIds ?? []) {
    const version = await ctx.db.get("documentVersions", versionId);

    if (version?.formKey !== skill.key) continue;
    const document = await ctx.db.get("documents", version.documentId);
    const metadata = await ctx.db.system.get("_storage", version.storageId);

    if (document?.organizationId !== run.context.job.organizationId)
      throw new ConvexError("request_source_access_denied");

    if (
      metadata === null ||
      version.contentType !== skill.contentType ||
      version.size !== metadata.size ||
      storageHashToHex(metadata.sha256) !== skill.sourceSha256
    )
      throw new ConvexError("request_source_fingerprint_mismatch");
    matches.push(version);
  }

  if (matches.length !== 1)
    throw new ConvexError(
      matches.length === 0
        ? "request_pinned_source_missing"
        : "request_pinned_source_ambiguous",
    );

  return { run, skill, version: matches[0] };
}

export const source = internalQuery({
  args: { ...runArgs, formKey: formKeyValidator },
  returns: schema.doc("documentVersions"),
  handler: async (ctx, args) => (await sourceForRun(ctx, args)).version,
});

export const saveDraft = internalMutation({
  args: {
    ...runArgs,
    traceId: v.string(),
    formKey: formKeyValidator,
    sourceVersionId: v.id("documentVersions"),
    sourceSha256: v.string(),
    storageId: v.id("_storage"),
    sha256: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // A duplicate/lost-response save is idempotent; do not delete its accepted blob.
    const previous = await itemAgentState(ctx.db, args.itemId);

    if (
      previous?.runId === args.runId &&
      previous.draft?.storageId === args.storageId &&
      previous.execution === "waiting"
    )
      return true;
    const { run, version, skill } = await sourceForRun(ctx, args);

    if (
      version._id !== args.sourceVersionId ||
      skill.sourceSha256 !== args.sourceSha256 ||
      version.storageId === args.storageId
    )
      throw new ConvexError("request_source_fingerprint_mismatch");
    const metadata = await ctx.db.system.get("_storage", args.storageId);

    if (
      metadata === null ||
      // Storage MIME metadata is optional. The trusted filler creates the Blob
      // with the selected skill's type; reject conflicting metadata when present.
      (metadata.contentType !== undefined &&
        metadata.contentType !== skill.contentType) ||
      metadata.size <= 0 ||
      metadata.size > 2_000_000 ||
      storageHashToHex(metadata.sha256) !== args.sha256
    )
      throw new ConvexError("request_draft_validation_failed");
    const values = requestValues(skill.key, run.context.job);
    const now = Date.now();

    const fieldProvenance = values.fields.map((field) => {
      const entry: Infer<typeof agentProvenanceValidator> = {
        source: field.label,
        method: field.method,
        observedAt: now,
        reference: field.reference,
      };

      if (
        field.method === "database" &&
        field.field !== "job_site_address" &&
        run.context.job.agentContext
      ) {
        entry.suppliedBy = run.context.job.agentContext.suppliedBy;
        entry.observedAt = run.context.job.agentContext.suppliedAt;
      }

      return entry;
    });

    const filename = `DEMO-DRAFT-${skill.key}.${skill.key === "building-permit-request" ? "pdf" : "docx"}`;
    await ctx.db.patch("checklistAgentStates", run.state._id, {
      execution: "waiting",
      currentStep: "waiting",
      traceId: args.traceId,
      error: undefined,
      updatedAt: now,
      finding: undefined,
      draft: {
        storageId: args.storageId,
        sourceVersionId: version._id,
        formKey: skill.key,
        sourceSha256: skill.sourceSha256,
        sha256: args.sha256,
        filename,
        contentType: skill.contentType,
        size: metadata.size,
        savedAt: now,
      },
      provenance: [
        {
          source: "Pinned original form",
          method: "database",
          observedAt: now,
          reference: `${version._id}:${skill.sourceSha256}`,
        },
        ...fieldProvenance,
      ],
      missingInformation: values.missingInformation,
      nextAction: values.nextAction,
    });

    if (run.state.draft && run.state.draft.storageId !== args.storageId)
      await ctx.storage.delete(run.state.draft.storageId);
    await ctx.scheduler.runAfter(0, internal.checklistExecution.drain, {
      jobId: run.context.job._id,
    });

    return true;
  },
});

export const discardCandidate = internalMutation({
  args: { itemId: v.id("checklistItems"), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const state = await itemAgentState(ctx.db, args.itemId);

    if (state?.draft?.storageId === args.storageId) return null;

    const libraryVersion = await ctx.db
      .query("documentVersions")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();

    if (libraryVersion === null) await ctx.storage.delete(args.storageId);

    return null;
  },
});

export const downloadContext = internalQuery({
  args: { itemId: v.string() },
  returns: agentDraftValidator,
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx);
    const itemId = ctx.db.normalizeId("checklistItems", args.itemId);

    if (itemId === null) throw new ConvexError("Request draft not found.");
    await requireOrganizationChecklistItem(
      ctx.db,
      itemId,
      membership.organizationId,
    );
    const state = await itemAgentState(ctx.db, itemId);

    if (!state?.draft) throw new ConvexError("Request draft not found.");

    return state.draft;
  },
});

export const registerSources = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    versions: v.array(
      v.object({
        versionId: v.id("documentVersions"),
        formKey: formKeyValidator,
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (
      args.versions.length !== 2 ||
      new Set(args.versions.map((entry) => entry.formKey)).size !== 2
    )
      throw new ConvexError("Choose the two supported form versions.");

    for (const entry of args.versions) {
      const skill = requestSkill(entry.formKey);
      const version = await ctx.db.get("documentVersions", entry.versionId);

      const document = version
        ? await ctx.db.get("documents", version.documentId)
        : null;

      const metadata = version
        ? await ctx.db.system.get("_storage", version.storageId)
        : null;

      if (
        !skill ||
        !version ||
        !metadata ||
        document?.organizationId !== args.organizationId ||
        version.contentType !== skill.contentType ||
        version.size !== metadata.size ||
        storageHashToHex(metadata.sha256) !== skill.sourceSha256
      )
        throw new ConvexError("Unsupported or inaccessible form source.");

      if (version.formKey !== undefined && version.formKey !== skill.key)
        throw new ConvexError(
          "This form version already has another compatibility key.",
        );
      await ctx.db.patch("documentVersions", version._id, {
        formKey: skill.key,
      });
    }

    return null;
  },
});
