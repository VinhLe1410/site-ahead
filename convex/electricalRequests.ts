import { v, type Infer } from "convex/values";
import { agentProvenanceValidator } from "./agentContracts";
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

    const provenance: Infer<typeof agentProvenanceValidator>[] = [
      {
        method: "database",
        source:
          "Saved job address, scope and available confirmed contact details",
        observedAt: Date.now(),
      },
    ];

    if (result.draft) {
      provenance.push({
        method: "database",
        source: "Official ESV public guidance",
        reference: result.draft.guidanceUrl,
        observedAt: Date.now(),
      });

      const demoFields = result.draft.fields.filter(
        (field) => field.method === "demo_data",
      );

      if (demoFields.length > 0)
        provenance.push({
          method: "demo_data",
          source: `Approved Electrical general draft examples: ${demoFields.map((field) => field.label).join(", ")}. Fictional or proposed, never confirmed job facts.`,
          observedAt: Date.now(),
        });
    }

    await ctx.db.patch("checklistAgentStates", run.state._id, {
      execution: "waiting",
      currentStep: "waiting",
      error: undefined,
      traceId: args.traceId,
      updatedAt: Date.now(),
      requestDraft: result.draft ?? undefined,
      missingInformation: result.missingInformation,
      nextAction: result.nextAction,
      provenance,
    });
    await ctx.scheduler.runAfter(0, internal.checklistExecution.drain, {
      jobId: run.context.job._id,
    });

    return true;
  },
});
