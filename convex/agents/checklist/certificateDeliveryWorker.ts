"use node";

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { schema } from "../../schema";
import { itemSnapshot } from "../../itemAgentData";
import { withAgentTrace } from "../shared/observability";

export const run = internalAction({
  args: { item: schema.doc("checklistItems"), runId: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const ids = { itemId: args.item._id, runId: args.runId };
    let actualTraceId: string | undefined;

    try {
      const initial = await ctx.runQuery(
        internal.checklistExecution.getRun,
        ids,
      );

      if (
        !initial ||
        itemSnapshot(initial.context.item) !== itemSnapshot(args.item)
      )
        throw new Error("saved_context_changed");

      const parent =
        initial.state.classification.traceId &&
        initial.state.classification.spanId
          ? {
              traceId: initial.state.classification.traceId,
              spanId: initial.state.classification.spanId,
            }
          : undefined;

      await withAgentTrace(
        `site-ahead-certificate-simulation-${args.runId}`,
        args.runId,
        async (traceId) => {
          actualTraceId = traceId;

          if (
            !(await ctx.runMutation(internal.checklistExecution.step, {
              ...ids,
              traceId,
              step: "persistence",
            }))
          )
            throw new Error("saved_context_changed");
          await ctx.runMutation(internal.electricalDelivery.simulate, {
            ...args,
            traceId,
          });
        },
        parent,
      );
    } catch (cause) {
      await ctx.runMutation(internal.checklistExecution.fail, {
        ...ids,
        traceId: actualTraceId,
        reason:
          cause instanceof Error && /^[a-z0-9_:-]{1,120}$/.test(cause.message)
            ? cause.message
            : "certificate_simulation_failed",
      });
    }

    return null;
  },
});
