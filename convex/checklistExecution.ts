import { createThread } from "@convex-dev/agent";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  getMembership,
  requireMembership,
  requireOrganizationChecklistItem,
  requireOrganizationJob,
} from "./access";
import { loadItemContext, itemContextValidator } from "./jobAgentContext";
import {
  classificationSnapshot,
  executionSnapshot,
  itemAgentState,
  itemSnapshot,
} from "./itemAgentData";
import {
  evidenceKind,
  evidenceResultValidator,
} from "./agents/checklist/liveEvidence";
import { schema } from "./schema";
import { logAgentStage } from "./agents/shared/agentLogging";

export const ITEM_CONCURRENCY = 3;

export const RUN_LEASE_MS = 180_000;

async function currentContext(
  ctx: QueryCtx,
  state: Doc<"checklistAgentStates">,
) {
  const item = await ctx.db.get("checklistItems", state.itemId);
  const context = item === null ? null : await loadItemContext(ctx.db, item);

  const membership =
    state.initiatedBy === undefined
      ? null
      : await getMembership(ctx.db, state.initiatedBy);

  if (
    context === null ||
    membership?.state !== "active" ||
    membership.organizationId !== context.job.organizationId ||
    context.item.status !== "pending" ||
    context.item.kind === "on_site" ||
    state.snapshot !== executionSnapshot(context)
  )
    return null;

  return context;
}

export async function enqueueItem(
  ctx: MutationCtx,
  item: Doc<"checklistItems">,
  initiatedBy: Id<"users">,
) {
  const state = await itemAgentState(ctx.db, item._id);

  if (
    item.status !== "pending" ||
    item.kind === "on_site" ||
    state === null ||
    state.classification.status !== "succeeded" ||
    state.execution === "running" ||
    state.queued
  )
    return false;
  const context = await loadItemContext(ctx.db, item);
  const membership = await getMembership(ctx.db, initiatedBy);

  if (
    context === null ||
    membership?.state !== "active" ||
    membership.organizationId !== context.job.organizationId
  )
    return false;
  const queueAttempt = (state.queueAttempt ?? 0) + 1;
  await ctx.db.patch("checklistAgentStates", state._id, {
    queued: true,
    queuedAt: Date.now(),
    queueAttempt,
    classification: { ...state.classification, dispatchPending: false },
    initiatedBy,
    snapshot: executionSnapshot(context),
    currentStep: "queued",
    error: undefined,
    updatedAt: Date.now(),
    nextAction: "Queued for item processing.",
  });
  await ctx.scheduler.runAfter(0, internal.checklistExecution.drain, {
    jobId: item.jobId,
  });
  await ctx.scheduler.runAfter(
    30_000,
    internal.checklistExecution.recoverQueue,
    { itemId: item._id, queueAttempt },
  );

  return true;
}

export const enqueue = internalMutation({
  args: {
    item: schema.doc("checklistItems"),
    initiatedBy: v.id("users"),
    classificationTraceId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get("checklistItems", args.item._id);
    const state = await itemAgentState(ctx.db, args.item._id);

    if (
      item === null ||
      itemSnapshot(item) !== itemSnapshot(args.item) ||
      state?.classification.traceId !== args.classificationTraceId
    )
      return false;

    const context = await loadItemContext(ctx.db, item);

    if (
      context === null ||
      state.classification.snapshot !== classificationSnapshot(context)
    )
      return false;

    return await enqueueItem(ctx, item, args.initiatedBy);
  },
});

export const recoverQueue = internalMutation({
  args: { itemId: v.id("checklistItems"), queueAttempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const state = await itemAgentState(ctx.db, args.itemId);

    if (!state?.queued || state.queueAttempt !== args.queueAttempt) return null;

    // 100 items / 3 slots at a three-minute maximum lease fits inside two hours.
    if (Date.now() - (state.queuedAt ?? 0) >= 2 * 60 * 60 * 1000) {
      await ctx.db.patch("checklistAgentStates", state._id, {
        queued: false,
        execution: "failed",
        currentStep: "dispatch",
        error: "queue_deadline_exceeded",
        nextAction: "The queue stopped responding. Retry this item.",
        updatedAt: Date.now(),
      });

      return null;
    }

    await ctx.scheduler.runAfter(0, internal.checklistExecution.drain, {
      jobId: state.jobId,
    });
    await ctx.scheduler.runAfter(
      30_000,
      internal.checklistExecution.recoverQueue,
      args,
    );

    return null;
  },
});

export const dispatchFailed = internalMutation({
  args: { itemId: v.id("checklistItems"), classificationTraceId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const state = await itemAgentState(ctx.db, args.itemId);

    if (
      state === null ||
      state.classification.status !== "succeeded" ||
      state.classification.traceId !== args.classificationTraceId ||
      (state.threadId !== undefined &&
        state.traceId === args.classificationTraceId) ||
      state.queued ||
      state.execution === "running"
    )
      return false;
    await ctx.db.patch("checklistAgentStates", state._id, {
      execution: "failed",
      currentStep: "dispatch",
      error: "dispatch_persistence_failed",
      classification: { ...state.classification, dispatchPending: false },
      traceId: args.classificationTraceId,
      nextAction: "Processing could not be queued. Retry this item.",
      updatedAt: Date.now(),
    });

    return true;
  },
});

async function prepareThread(
  ctx: MutationCtx,
  state: Doc<"checklistAgentStates">,
): Promise<string> {
  const threadId =
    state.threadId ??
    (await createThread(ctx, components.agent, {
      userId: state.initiatedBy,
      title: `Checklist item ${state.itemId}`,
    }));

  if (state.threadId === undefined)
    await ctx.db.patch("checklistAgentStates", state._id, { threadId });

  return threadId;
}

export const drain = internalMutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const states = await ctx.db
      .query("checklistAgentStates")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(101);

    if (states.length > 100)
      throw new ConvexError("Checklist exceeds its supported size.");

    let available =
      ITEM_CONCURRENCY -
      states.filter((state) => state.execution === "running").length;

    for (const state of states) {
      if (!state.queued || available <= 0) continue;
      const context = await currentContext(ctx, state);

      if (context === null || state.classification.status !== "succeeded") {
        await ctx.db.patch("checklistAgentStates", state._id, {
          queued: false,
          execution: "failed",
          error: "saved_context_changed",
          currentStep: "dispatch",
          nextAction: "Review the current saved item and retry.",
          updatedAt: Date.now(),
        });
        continue;
      }

      let threadId: string;

      try {
        threadId = await prepareThread(ctx, state);
      } catch {
        await ctx.db.patch("checklistAgentStates", state._id, {
          queued: false,
          execution: "failed",
          currentStep: "dispatch",
          error: "thread_preparation_failed",
          nextAction: "The item thread could not be prepared. Retry this item.",
          updatedAt: Date.now(),
        });
        continue;
      }

      const attempt = (state.attempt ?? 0) + 1;
      const runId = `${state._id}:${attempt}`;
      await ctx.db.patch("checklistAgentStates", state._id, {
        queued: false,
        threadId,
        runId,
        attempt,
        execution: "running",
        currentStep: "dispatch",
        startedAt: Date.now(),
        deadlineAt: Date.now() + RUN_LEASE_MS,
        updatedAt: Date.now(),
        traceId: state.classification.traceId,
        error: undefined,
        nextAction: "Processing this item.",
      });
      await ctx.scheduler.runAfter(
        0,
        context.item.kind === "third_party"
          ? internal.agents.requests.requestWorker.run
          : internal.agents.checklist.itemWorker.run,
        { item: context.item, runId },
      );
      await ctx.scheduler.runAfter(
        RUN_LEASE_MS,
        internal.checklistExecution.expire,
        { itemId: state.itemId, runId },
      );
      logAgentStage({
        stage: "dispatch",
        outcome: "claimed",
        itemId: state.itemId,
        threadId,
        runId,
        traceId: state.classification.traceId,
      });
      available -= 1;
    }

    return null;
  },
});

export const getRun = internalQuery({
  args: { itemId: v.id("checklistItems"), runId: v.string() },
  returns: v.union(
    v.object({
      context: itemContextValidator,
      state: schema.doc("checklistAgentStates"),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => await loadExecutionRun(ctx, args),
});

export async function loadExecutionRun(
  ctx: QueryCtx,
  args: { itemId: Id<"checklistItems">; runId: string },
) {
  const state = await itemAgentState(ctx.db, args.itemId);

  if (
    state === null ||
    state.execution !== "running" ||
    state.runId !== args.runId ||
    (state.deadlineAt ?? 0) <= Date.now()
  )
    return null;
  const context = await currentContext(ctx, state);

  return context === null ? null : { context, state };
}

export const step = internalMutation({
  args: {
    itemId: v.id("checklistItems"),
    runId: v.string(),
    traceId: v.string(),
    step: v.union(
      v.literal("database_lookup"),
      v.literal("api_call"),
      v.literal("model"),
      v.literal("persistence"),
      v.literal("skill_selection"),
      v.literal("form_read"),
      v.literal("form_fill"),
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const state = await itemAgentState(ctx.db, args.itemId);

    if (
      state === null ||
      state.runId !== args.runId ||
      state.execution !== "running" ||
      (state.deadlineAt ?? 0) <= Date.now() ||
      (await currentContext(ctx, state)) === null
    )
      return false;
    await ctx.db.patch("checklistAgentStates", state._id, {
      currentStep: args.step,
      traceId: args.traceId,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const saveEvidence = internalMutation({
  args: {
    itemId: v.id("checklistItems"),
    runId: v.string(),
    traceId: v.string(),
    result: evidenceResultValidator,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const state = await itemAgentState(ctx.db, args.itemId);

    if (
      state === null ||
      state.execution !== "running" ||
      state.runId !== args.runId ||
      (state.deadlineAt ?? 0) <= Date.now()
    )
      return false;
    const context = await currentContext(ctx, state);

    if (context === null || context.item.kind !== "automated") return false;
    const { result } = args;

    if (
      result.status === "resolved" &&
      result.finding.kind !== evidenceKind(context.item.title)
    )
      throw new ConvexError("Evidence does not match this item.");
    await ctx.db.patch("checklistAgentStates", state._id, {
      execution: result.status === "resolved" ? "finished" : "waiting",
      currentStep: result.status === "resolved" ? "saved" : "waiting",
      traceId: args.traceId,
      error: undefined,
      updatedAt: Date.now(),
      finding: result.status === "resolved" ? result.finding : undefined,
      provenance: result.provenance,
      missingInformation:
        result.status === "resolved" ? [] : result.missingInformation,
      nextAction:
        result.status === "resolved"
          ? "Review the saved finding and its coverage."
          : result.reason,
    });

    if (result.status === "resolved")
      await ctx.db.patch("checklistItems", args.itemId, { status: "done" });
    await ctx.scheduler.runAfter(0, internal.checklistExecution.drain, {
      jobId: state.jobId,
    });

    return true;
  },
});

export const fail = internalMutation({
  args: {
    itemId: v.id("checklistItems"),
    runId: v.string(),
    traceId: v.optional(v.string()),
    reason: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const state = await itemAgentState(ctx.db, args.itemId);

    if (
      state === null ||
      state.runId !== args.runId ||
      state.execution !== "running"
    )
      return false;

    const reason = /^[a-z0-9_:-]{1,120}$/.test(args.reason)
      ? args.reason
      : "item_processing_failed";

    await ctx.db.patch("checklistAgentStates", state._id, {
      execution: "failed",
      queued: false,
      traceId: args.traceId ?? state.traceId,
      error: reason,
      updatedAt: Date.now(),
      nextAction:
        "Review the failure and saved information, then retry this item.",
    });
    await ctx.scheduler.runAfter(0, internal.checklistExecution.drain, {
      jobId: state.jobId,
    });

    return true;
  },
});

export const expire = internalMutation({
  args: { itemId: v.id("checklistItems"), runId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const state = await itemAgentState(ctx.db, args.itemId);

    if (
      state === null ||
      state.runId !== args.runId ||
      state.execution !== "running" ||
      (state.deadlineAt ?? 0) > Date.now()
    )
      return null;
    await ctx.db.patch("checklistAgentStates", state._id, {
      execution: "failed",
      queued: false,
      error: "execution_deadline_exceeded",
      updatedAt: Date.now(),
      nextAction:
        "The run stopped responding. Retry this item to resume its existing thread.",
    });
    await ctx.scheduler.runAfter(0, internal.checklistExecution.drain, {
      jobId: state.jobId,
    });

    return null;
  },
});

export const retry = mutation({
  args: { itemId: v.id("checklistItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx);

    const item = await requireOrganizationChecklistItem(
      ctx.db,
      args.itemId,
      membership.organizationId,
    );

    const state = await itemAgentState(ctx.db, item._id);

    if (
      item.status !== "pending" ||
      state?.execution === "running" ||
      state?.queued ||
      state?.classification.status === "running"
    )
      return null;

    if (state?.classification.status !== "succeeded")
      await ctx.scheduler.runAfter(
        0,
        internal.agents.checklist.processChecklist.run,
        { items: [item], initiatedBy: membership.userId },
      );
    else await enqueueItem(ctx, item, membership.userId);

    return null;
  },
});

export const start = mutation({
  args: { itemIds: v.array(v.id("checklistItems")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx);

    if (
      args.itemIds.length > 100 ||
      new Set(args.itemIds).size !== args.itemIds.length
    )
      throw new ConvexError("Choose at most 100 distinct items.");
    const items = [];

    for (const itemId of args.itemIds)
      items.push(
        await requireOrganizationChecklistItem(
          ctx.db,
          itemId,
          membership.organizationId,
        ),
      );
    await ctx.scheduler.runAfter(
      0,
      internal.agents.checklist.processChecklist.run,
      { items, initiatedBy: membership.userId },
    );

    return null;
  },
});

export const list = query({
  args: { jobId: v.id("jobs") },
  returns: v.array(schema.doc("checklistAgentStates")),
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx);
    await requireOrganizationJob(ctx.db, args.jobId, membership.organizationId);

    return await ctx.db
      .query("checklistAgentStates")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(100);
  },
});
