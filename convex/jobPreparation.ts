import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  activeMembership,
  requireMembership,
  requireOrganizationJob,
} from "./access";
import { schema } from "./schema";
import { loadPreparationContext } from "./jobPreparationContext";
import {
  clientMessageSnapshot,
  composeClientMessage,
  DISMISSAL_LIMIT,
  MESSAGE_LIMIT,
  preparationStatusValidator,
} from "./preparationContracts";

export async function preparationRecord(db: QueryCtx["db"], jobId: Id<"jobs">) {
  return await db
    .query("jobPreparations")
    .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
    .unique();
}

async function editablePreparation(ctx: MutationCtx, jobId: Id<"jobs">) {
  const membership = await requireMembership(ctx);

  const job = await requireOrganizationJob(
    ctx.db,
    jobId,
    membership.organizationId,
  );

  const record = await preparationRecord(ctx.db, jobId);

  if (!record) throw new ConvexError("Generate preparation first.");
  const context = await loadPreparationContext(ctx.db, job);

  return { record, context };
}

export const get = query({
  args: { jobId: v.id("jobs") },
  returns: v.union(
    v.object({
      record: v.union(schema.doc("jobPreparations"), v.null()),
      supported: v.boolean(),
      stale: v.boolean(),
      staleEntryIds: v.array(v.string()),
      messageStale: v.boolean(),
      contextError: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const membership = await activeMembership(ctx);

    if (!membership) return null;
    const job = await ctx.db.get("jobs", args.jobId);

    if (!job || job.organizationId !== membership.organizationId) return null;

    const [record, context] = await Promise.all([
      preparationRecord(ctx.db, job._id),
      loadPreparationContext(ctx.db, job),
    ]);

    const stale =
      record?.contextFingerprint !== undefined &&
      record.contextFingerprint !== context.fingerprint;

    const staleEntryIds =
      record?.entries
        .filter((entry) => entry.contextFingerprint !== context.fingerprint)
        .map((entry) => entry.id) ?? [];

    return {
      record,
      supported: context.supported,
      stale,
      staleEntryIds,
      messageStale:
        record?.message !== undefined &&
        (stale ||
          record.message.sourceSnapshot !==
            clientMessageSnapshot(record.entries, context.fingerprint)),
      contextError: context.error,
    };
  },
});

export const setStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    entryId: v.string(),
    status: preparationStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { record, context } = await editablePreparation(ctx, args.jobId);
    const entry = record.entries.find((value) => value.id === args.entryId);

    if (!entry)
      throw new ConvexError("Preparation item not found. Reload the job.");

    if (entry.status === args.status) return null;

    if (entry.status === "dismissed")
      throw new ConvexError(
        "This item was dismissed. Refresh preparation from the saved job.",
      );

    const dismissedActions =
      record.dismissedContextFingerprint === context.fingerprint
        ? [...record.dismissedActions]
        : [];

    if (
      args.status === "dismissed" &&
      !dismissedActions.includes(entry.action)
    ) {
      if (dismissedActions.length >= DISMISSAL_LIMIT)
        throw new ConvexError(
          "This job has reached its preparation dismissal limit. Update its description before requesting different advice.",
        );
      dismissedActions.push(entry.action);
    }

    await ctx.db.patch("jobPreparations", record._id, {
      entries: record.entries.map((value) =>
        value.id === args.entryId ? { ...value, status: args.status } : value,
      ),
      revision: record.revision + 1,
      dismissedActions,
      dismissedContextFingerprint: context.fingerprint,
    });

    if (record.run)
      await ctx.db.patch("jobPreparations", record._id, {
        run: undefined,
        generation: "failed",
        error:
          "Preparation changed during generation. Refresh to use the saved decisions.",
      });

    return null;
  },
});

export const saveMessage = mutation({
  args: { jobId: v.id("jobs"), text: v.string(), expectedRevision: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { record, context } = await editablePreparation(ctx, args.jobId);

    if ((record.message?.revision ?? 0) !== args.expectedRevision)
      throw new ConvexError(
        "The saved message changed. Reload its latest version before saving your edits.",
      );

    if (args.text.length > MESSAGE_LIMIT)
      throw new ConvexError(
        `Keep the client message within ${MESSAGE_LIMIT} characters.`,
      );
    await ctx.db.patch("jobPreparations", record._id, {
      message: {
        text: args.text.trim() || null,
        sourceSnapshot: clientMessageSnapshot(
          record.entries,
          context.fingerprint,
        ),
        revision: args.expectedRevision + 1,
        edited: true,
      },
    });

    return null;
  },
});

export const regenerateMessage = mutation({
  args: { jobId: v.id("jobs"), expectedRevision: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { record, context } = await editablePreparation(ctx, args.jobId);

    if ((record.message?.revision ?? 0) !== args.expectedRevision)
      throw new ConvexError(
        "The saved message changed. Reload before regenerating it.",
      );

    if (
      !context.supported ||
      context.error ||
      record.entries.some(
        (entry) =>
          entry.status === "pending" &&
          entry.contextFingerprint !== context.fingerprint,
      )
    )
      throw new ConvexError(
        "Refresh preparation before drafting from changed job details.",
      );
    await ctx.db.patch("jobPreparations", record._id, {
      message: {
        text: composeClientMessage(record.entries),
        sourceSnapshot: clientMessageSnapshot(
          record.entries,
          context.fingerprint,
        ),
        revision: args.expectedRevision + 1,
        edited: false,
      },
    });

    return null;
  },
});
