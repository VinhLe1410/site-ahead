import { ConvexError, v } from "convex/values";
import { electricalItemKind } from "../shared/electrical";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getMembership } from "./access";
import { checklistKindValidator } from "./contracts";
import { loadItemContext } from "./jobAgentContext";
import { schema } from "./schema";
import {
  itemAgentState,
  itemSnapshot,
  classificationSnapshot,
} from "./itemAgentData";

export const claim = internalMutation({
  args: {
    items: v.array(schema.doc("checklistItems")),
    initiatedBy: v.id("users"),
    dispatchExpected: v.optional(v.boolean()),
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
          state.execution === "running" ||
          state.queued)
      )
        continue;

      const values = {
        classification: {
          status: "running" as const,
          dispatchPending: args.dispatchExpected === true,
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

    const expectedKind =
      item === null ? undefined : electricalItemKind(item.title);

    const failure = stale
      ? "saved_context_changed"
      : (args.failure ??
        (args.category === undefined
          ? "missing_model_category"
          : expectedKind !== undefined && args.category !== expectedKind
            ? "electrical_item_category_mismatch"
            : undefined));

    if (failure !== undefined) {
      await ctx.db.patch("checklistAgentStates", state._id, {
        classification: {
          ...state.classification,
          status: "failed",
          dispatchPending: false,
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

    if (item === null || args.category === undefined || context === null)
      return false;
    await ctx.db.patch("checklistItems", item._id, { kind: args.category });
    await ctx.db.patch("checklistAgentStates", state._id, {
      classification: {
        ...state.classification,
        status: "succeeded",
        dispatchPending:
          state.classification.dispatchPending === true &&
          args.category !== "on_site",
        traceId: args.traceId,
        snapshot: classificationSnapshot({
          ...context,
          item: { ...item, kind: args.category },
        }),
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
      state !== null &&
      state.classification.runId === args.runId &&
      state.classification.status === "succeeded" &&
      state.classification.dispatchPending &&
      !state.queued &&
      state.execution !== "running" &&
      !(
        state.execution === "finished" &&
        state.traceId === state.classification.traceId
      )
    ) {
      await ctx.db.patch("checklistAgentStates", state._id, {
        classification: { ...state.classification, dispatchPending: false },
        execution: "failed",
        currentStep: "dispatch",
        error: "classification_dispatch_interrupted",
        traceId: state.classification.traceId,
        updatedAt: Date.now(),
        nextAction:
          "Classification succeeded but item processing was interrupted. Retry this item.",
      });

      return null;
    }

    if (
      state?.classification.status === "running" &&
      state.classification.runId === args.runId
    )
      await ctx.db.patch("checklistAgentStates", state._id, {
        classification: {
          ...state.classification,
          status: "failed",
          error: "classification_deadline_exceeded",
          dispatchPending: false,
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
