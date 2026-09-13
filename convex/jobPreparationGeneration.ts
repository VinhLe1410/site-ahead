import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  getMembership,
  requireMembership,
  requireOrganizationJob,
} from "./access";
import { loadPreparationContext } from "./jobPreparationContext";
import { preparationRecord } from "./jobPreparation";
import {
  clientMessageSnapshot,
  composeClientMessage,
  PREPARATION_LIMIT,
  PREPARATION_PROMPT_VERSION,
  preparationEntryValidator,
  preparationSuggestionValidator,
  type PreparationEntry,
} from "./preparationContracts";
import { validatePreparationSuggestions } from "./preparationValidation";

export const PREPARATION_LEASE_MS = 90_000;

type PreparationContext = Awaited<ReturnType<typeof loadPreparationContext>>;

function exclusions(
  record: Doc<"jobPreparations">,
  context: PreparationContext,
) {
  return [
    ...context.checklistTitles,
    ...record.entries
      .filter((entry) => entry.status === "done")
      .map((entry) => entry.action),
    ...(record.dismissedContextFingerprint === context.fingerprint
      ? record.dismissedActions
      : []),
  ];
}

export async function claimPreparation(
  ctx: MutationCtx,
  job: Doc<"jobs">,
  initiatedBy: Id<"users">,
  initialRetryAvailable: boolean,
) {
  const context = await loadPreparationContext(ctx.db, job);

  if (!context.supported) return;
  const record = await preparationRecord(ctx.db, job._id);
  const now = Date.now();

  if (record?.run && record.run.deadlineAt > now) return;

  if (
    record?.entries.filter((entry) => entry.status === "done").length ===
    PREPARATION_LIMIT
  )
    throw new ConvexError(
      "All three preparation slots are completed. Reopen or dismiss an item before refreshing.",
    );

  const run = {
    id: `${now}-${Math.random().toString(36).slice(2)}`,
    initiatedBy,
    revision: record?.revision ?? 0,
    contextFingerprint: context.fingerprint,
    authoritativeFingerprint: context.authoritativeFingerprint,
    deadlineAt: now + PREPARATION_LEASE_MS,
    initialRetryAvailable,
  };

  if (record) {
    await ctx.db.patch("jobPreparations", record._id, {
      generation: context.error ? "failed" : "running",
      run: context.error ? undefined : run,
      error: context.error ?? undefined,
    });
  } else {
    await ctx.db.insert("jobPreparations", {
      jobId: job._id,
      entries: [],
      generation: context.error ? "failed" : "running",
      revision: 0,
      ...(context.error ? { error: context.error } : { run }),
      promptVersion: PREPARATION_PROMPT_VERSION,
      dismissedContextFingerprint: context.fingerprint,
      dismissedActions: [],
    });
  }

  if (context.error) return;
  await ctx.scheduler.runAfter(
    0,
    internal.agents.preparation.recommendPreparation.run,
    { jobId: job._id, runId: run.id },
  );
  await ctx.scheduler.runAfter(
    PREPARATION_LEASE_MS,
    internal.jobPreparationGeneration.expire,
    { jobId: job._id, runId: run.id },
  );
}

export const start = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx);

    const job = await requireOrganizationJob(
      ctx.db,
      args.jobId,
      membership.organizationId,
    );

    await claimPreparation(ctx, job, membership.userId, false);

    return null;
  },
});

export const expire = internalMutation({
  args: { jobId: v.id("jobs"), runId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await preparationRecord(ctx.db, args.jobId);

    if (record?.run?.id === args.runId && record.run.deadlineAt <= Date.now())
      await ctx.db.patch("jobPreparations", record._id, {
        generation: "failed",
        run: undefined,
        error: "Preparation timed out. Try generating it again.",
      });

    return null;
  },
});

export const getRunContext = internalQuery({
  args: { jobId: v.id("jobs"), runId: v.string() },
  returns: v.union(
    v.object({
      ready: v.boolean(),
      sourceText: v.string(),
      description: v.string(),
      availableSlots: v.number(),
      exclusions: v.array(v.string()),
      completed: v.array(preparationEntryValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("jobs", args.jobId);
    const record = await preparationRecord(ctx.db, args.jobId);

    if (!job || !record?.run || record.run.id !== args.runId) return null;
    const membership = await getMembership(ctx.db, record.run.initiatedBy);

    if (
      membership?.state !== "active" ||
      membership.organizationId !== job.organizationId
    )
      return null;
    const context = await loadPreparationContext(ctx.db, job);
    const completed = record.entries.filter((entry) => entry.status === "done");

    return {
      ready:
        context.fingerprint === record.run.contextFingerprint &&
        !context.error &&
        context.supported,
      sourceText: context.error ? "" : context.sourceText,
      description: context.error ? "" : context.description,
      availableSlots: PREPARATION_LIMIT - completed.length,
      exclusions: exclusions(record, context),
      completed,
    };
  },
});

export const finish = internalMutation({
  args: {
    jobId: v.id("jobs"),
    runId: v.string(),
    suggestions: v.optional(v.array(preparationSuggestionValidator)),
    failure: v.optional(
      v.union(
        v.literal("provider"),
        v.literal("invalid_output"),
        v.literal("configuration"),
        v.literal("context"),
      ),
    ),
  },
  returns: v.union(
    v.literal("saved"),
    v.literal("discarded"),
    v.literal("retrying"),
    v.literal("failed"),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("jobs", args.jobId);
    const record = await preparationRecord(ctx.db, args.jobId);

    if (!job || !record?.run || record.run.id !== args.runId)
      return "discarded";
    const run = record.run;
    const membership = await getMembership(ctx.db, run.initiatedBy);

    if (
      membership?.state !== "active" ||
      membership.organizationId !== job.organizationId
    ) {
      await ctx.db.patch("jobPreparations", record._id, {
        run: undefined,
        generation: "failed",
        error:
          "Preparation access changed during generation. An active member can retry.",
      });

      return "discarded";
    }

    const context = await loadPreparationContext(ctx.db, job);

    const changed =
      context.fingerprint !== run.contextFingerprint ||
      record.revision !== run.revision;

    if (changed || run.deadlineAt <= Date.now()) {
      await ctx.db.patch("jobPreparations", record._id, {
        run: undefined,
        generation: "failed",
        error:
          "The saved job changed or preparation expired. Refresh to use the latest details.",
      });

      if (
        changed &&
        run.initialRetryAvailable &&
        run.revision === record.revision &&
        run.authoritativeFingerprint === context.authoritativeFingerprint &&
        run.deadlineAt > Date.now()
      ) {
        await claimPreparation(ctx, job, run.initiatedBy, false);

        return "retrying";
      }

      return "discarded";
    }

    if (args.failure || !args.suggestions) {
      const error =
        args.failure === "configuration"
          ? "Preparation is unavailable because its model is not configured. Try again after configuration is restored."
          : args.failure === "invalid_output"
            ? "The model returned preparation that could not be validated. Try again."
            : "Preparation could not be generated. Please try again.";

      await ctx.db.patch("jobPreparations", record._id, {
        run: undefined,
        generation: "failed",
        error,
      });

      return "failed";
    }

    const completed = record.entries.filter((entry) => entry.status === "done");

    try {
      validatePreparationSuggestions(
        args.suggestions,
        context.description,
        PREPARATION_LIMIT - completed.length,
        exclusions(record, context),
      );
    } catch {
      await ctx.db.patch("jobPreparations", record._id, {
        run: undefined,
        generation: "failed",
        error:
          "The model returned preparation that could not be validated. Try again.",
      });

      return "failed";
    }

    const entries: PreparationEntry[] = [
      ...completed,
      ...args.suggestions.map((suggestion, index) => ({
        ...suggestion,
        id: `${args.runId}-${index}`,
        status: "pending" as const,
        contextFingerprint: context.fingerprint,
      })),
    ];

    const message = record.message?.edited
      ? record.message
      : {
          text: composeClientMessage(entries),
          sourceSnapshot: clientMessageSnapshot(entries, context.fingerprint),
          revision: (record.message?.revision ?? 0) + 1,
          edited: false,
        };

    await ctx.db.patch("jobPreparations", record._id, {
      entries,
      message,
      run: undefined,
      error: undefined,
      generation: "succeeded",
      contextFingerprint: context.fingerprint,
      revision: record.revision + 1,
      promptVersion: PREPARATION_PROMPT_VERSION,
      dismissedContextFingerprint: context.fingerprint,
      dismissedActions:
        record.dismissedContextFingerprint === context.fingerprint
          ? record.dismissedActions
          : [],
    });

    return "saved";
  },
});
