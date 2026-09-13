import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getMembership } from "./access";
import { checklistKindValidator } from "./contracts";
import { loadItemContext, type ItemContext } from "./jobAgentContext";
import { schema } from "./schema";

export async function itemAgentState(
  db: MutationCtx["db"],
  itemId: Id<"checklistItems">,
) {
  return await db
    .query("checklistAgentStates")
    .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
    .unique();
}

function itemSnapshot(item: Doc<"checklistItems">) {
  return JSON.stringify([
    item._id,
    item._creationTime,
    item.jobId,
    item.title,
    item.kind,
    item.status,
    item.notes,
    item.documentVersionIds ?? [],
  ]);
}

export function classificationSnapshot(context: ItemContext) {
  return JSON.stringify({
    item: itemSnapshot(context.item),
    organizationId: context.job.organizationId,
    inputId: context.job.inputId,
    address: context.job.addressText,
    text: context.input.processedText,
    categoryId: context.job.categoryId,
    categoryTitle: context.category?.title,
  });
}

export const claim = internalMutation({
  args: {
    items: v.array(schema.doc("checklistItems")),
    initiatedBy: v.id("users"),
    runId: v.string(),
    traceId: v.string(),
    spanId: v.string(),
  },
  returns: v.array(
    v.object({ item: schema.doc("checklistItems"), jobType: v.string() }),
  ),
  handler: async (ctx, args) => {
    if (
      args.items.length > 100 ||
      new Set(args.items.map((item) => item._id)).size !== args.items.length
    )
      throw new ConvexError(
        "Process at most 100 distinct checklist items at once.",
      );
    const membership = await getMembership(ctx.db, args.initiatedBy);

    if (membership?.state !== "active") return [];
    const claimed: Array<{ item: Doc<"checklistItems">; jobType: string }> = [];

    for (const supplied of args.items) {
      const item = await ctx.db.get("checklistItems", supplied._id);

      if (
        item === null ||
        item.status !== "pending" ||
        itemSnapshot(item) !== itemSnapshot(supplied)
      )
        continue;
      const context = await loadItemContext(ctx.db, item);

      if (
        context === null ||
        context.job.organizationId !== membership.organizationId
      )
        continue;
      const state = await itemAgentState(ctx.db, item._id);

      if (
        state !== null &&
        (state.classification.status === "running" ||
          state.execution === "running")
      )
        continue;

      const values = {
        classification: {
          status: "running" as const,
          runId: args.runId,
          traceId: args.traceId,
          spanId: args.spanId,
          initiatedBy: args.initiatedBy,
          snapshot: classificationSnapshot(context),
        },
        updatedAt: Date.now(),
      };

      if (state === null)
        await ctx.db.insert("checklistAgentStates", {
          ...values,
          itemId: item._id,
          jobId: item.jobId,
          execution: "idle",
          currentStep: "classification",
          nextAction: "Classifying this pending item.",
          provenance: [],
          missingInformation: [],
        });
      else await ctx.db.patch("checklistAgentStates", state._id, values);
      await ctx.scheduler.runAfter(
        120_000,
        internal.checklistClassification.expire,
        { itemId: item._id, runId: args.runId },
      );
      claimed.push({
        item,
        jobType: context.category?.title ?? "Uncategorized",
      });
    }

    return claimed;
  },
});

export const save = internalMutation({
  args: {
    itemId: v.id("checklistItems"),
    runId: v.string(),
    traceId: v.string(),
    category: v.optional(checklistKindValidator),
    failure: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const state = await itemAgentState(ctx.db, args.itemId);

    if (
      state === null ||
      state.classification.status !== "running" ||
      state.classification.runId !== args.runId
    )
      return false;
    const item = await ctx.db.get("checklistItems", args.itemId);
    const context = item === null ? null : await loadItemContext(ctx.db, item);

    const membership =
      state.classification.initiatedBy === undefined
        ? null
        : await getMembership(ctx.db, state.classification.initiatedBy);

    const stale =
      context === null ||
      membership?.state !== "active" ||
      membership.organizationId !== context.job.organizationId ||
      classificationSnapshot(context) !== state.classification.snapshot;

    const failure = stale
      ? "saved_context_changed"
      : (args.failure ??
        (args.category === undefined ? "missing_model_category" : undefined));

    if (failure !== undefined) {
      await ctx.db.patch("checklistAgentStates", state._id, {
        classification: {
          ...state.classification,
          status: "failed",
          traceId: args.traceId,
          error: failure,
        },
        execution: state.threadId === undefined ? "failed" : state.execution,
        currentStep:
          state.threadId === undefined ? "classification" : state.currentStep,
        error: state.threadId === undefined ? failure : state.error,
        updatedAt: Date.now(),
        nextAction:
          state.threadId === undefined
            ? "Retry classification using the current saved item."
            : state.nextAction,
      });

      return false;
    }

    if (item === null || args.category === undefined) return false;
    await ctx.db.patch("checklistItems", item._id, { kind: args.category });
    await ctx.db.patch("checklistAgentStates", state._id, {
      classification: {
        ...state.classification,
        status: "succeeded",
        traceId: args.traceId,
      },
      execution: state.threadId === undefined ? "idle" : state.execution,
      currentStep:
        state.threadId === undefined
          ? args.category === "on_site"
            ? "human_check"
            : "ready"
          : state.currentStep,
      error: state.threadId === undefined ? undefined : state.error,
      updatedAt: Date.now(),
      nextAction:
        state.threadId === undefined
          ? args.category === "on_site"
            ? "Complete this check manually."
            : "Ready for item processing."
          : state.nextAction,
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
      state?.classification.status === "running" &&
      state.classification.runId === args.runId
    )
      await ctx.db.patch("checklistAgentStates", state._id, {
        classification: {
          ...state.classification,
          status: "failed",
          error: "classification_deadline_exceeded",
        },
        execution: state.threadId === undefined ? "failed" : state.execution,
        currentStep:
          state.threadId === undefined ? "classification" : state.currentStep,
        error:
          state.threadId === undefined
            ? "classification_deadline_exceeded"
            : state.error,
        updatedAt: Date.now(),
        nextAction:
          state.threadId === undefined
            ? "Classification was interrupted. Retry this item."
            : state.nextAction,
      });

    return null;
  },
});
