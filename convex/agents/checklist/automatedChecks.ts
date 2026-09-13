"use node";

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { schema } from "../../schema";
import type { Id } from "../../_generated/dataModel";
import type { EvidenceResult } from "./liveEvidence";
import type { ItemContext } from "../../jobAgentContext";
import {
  evidenceKind,
  evidenceResultValidator,
  EvidenceFailure,
  resolveLiveEvidence,
} from "./liveEvidence";

type AutomatedCheckResult = {
  itemId: Id<"checklistItems">;
  result: EvidenceResult | { status: "failed"; reason: string; source: string };
};

export const resolveAutomatedChecklistItems = internalAction({
  args: {
    items: v.array(schema.doc("checklistItems")),
    initiatedBy: v.id("users"),
  },
  returns: v.array(
    v.object({
      itemId: v.id("checklistItems"),
      result: v.union(
        evidenceResultValidator,
        v.object({
          status: v.literal("failed"),
          reason: v.string(),
          source: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args): Promise<AutomatedCheckResult[]> => {
    if (args.items.length > 100)
      throw new Error("At most 100 checklist items are supported.");
    const results: AutomatedCheckResult[] = [];

    // This internal adapter verifier performs no item completion or dispatch.
    for (const item of args.items) {
      if (item.status !== "pending") continue;

      const context: ItemContext | null = await ctx.runQuery(
        internal.jobAgentContext.get,
        {
          itemId: item._id,
          initiatedBy: args.initiatedBy,
        },
      );

      if (context === null || context.item.status !== "pending") continue;
      const kind = evidenceKind(context.item.title);

      if (kind === null) continue;

      try {
        results.push({
          itemId: item._id,
          result: await resolveLiveEvidence(kind, context),
        });
      } catch (error) {
        results.push({
          itemId: item._id,
          result: {
            status: "failed" as const,
            reason:
              error instanceof EvidenceFailure
                ? error.code
                : "evidence_check_failed",
            source: error instanceof EvidenceFailure ? error.source : "unknown",
          },
        });
      }
    }

    return results;
  },
});
