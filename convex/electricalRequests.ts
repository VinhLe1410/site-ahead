import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { loadExecutionRun } from "./checklistExecution";
import { prepareElectricalRequest } from "./agents/requests/electricalRequestSkills";

export const save = internalMutation({
  args: {
    itemId: v.id("checklistItems"),
    runId: v.string(),
    traceId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const run = await loadExecutionRun(ctx, args);

    if (run === null) return false;
    const result = prepareElectricalRequest(run.context, Date.now());
    await ctx.db.patch("checklistAgentStates", run.state._id, {
      execution: "waiting",
      currentStep: "waiting",
      error: undefined,
      traceId: args.traceId,
      updatedAt: Date.now(),
      requestDraft: result.draft ?? undefined,
      missingInformation: result.missingInformation,
      nextAction: result.nextAction,
      provenance: [
        {
          method: "database",
          source:
            "Saved job address, scope and confirmed contact details; no Electrical demo defaults",
          observedAt: Date.now(),
        },
        ...(result.draft
          ? [
              {
                method: "database" as const,
                source: "Official ESV public guidance",
                reference: result.draft.guidanceUrl,
                observedAt: Date.now(),
              },
            ]
          : []),
      ],
    });
    await ctx.scheduler.runAfter(0, internal.checklistExecution.drain, {
      jobId: run.context.job._id,
    });

    return true;
  },
});
