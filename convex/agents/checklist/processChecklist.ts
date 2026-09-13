"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { schema } from "../../schema";
import { logAgentStage } from "../shared/agentLogging";

export const run = internalAction({
  args: {
    items: v.array(schema.doc("checklistItems")),
    initiatedBy: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.runAction(
      internal.agents.checklist.itemResolutionClassifier.classifyChecklistItems,
      { ...args, dispatchExpected: true },
    );

    for (const supplied of args.items) {
      if (
        !result.classifications.some(
          (item) => item.id === supplied._id && item.category !== "on_site",
        )
      )
        continue;

      try {
        const context = await ctx.runQuery(internal.jobAgentContext.get, {
          itemId: supplied._id,
          initiatedBy: args.initiatedBy,
        });

        if (context !== null)
          await ctx.runMutation(internal.checklistExecution.enqueue, {
            item: context.item,
            initiatedBy: args.initiatedBy,
            classificationTraceId: result.traceId,
          });
      } catch {
        try {
          await ctx.runMutation(internal.checklistExecution.dispatchFailed, {
            itemId: supplied._id,
            classificationTraceId: result.traceId,
          });
        } catch {
          // Preserve sibling isolation when even the failure write is unavailable.
          logAgentStage({
            stage: "persistence",
            outcome: "failed",
            itemId: supplied._id,
            traceId: result.traceId,
          });
        }

        logAgentStage({
          stage: "dispatch",
          outcome: "failed",
          itemId: supplied._id,
          traceId: result.traceId,
        });
      }
    }

    return null;
  },
});
