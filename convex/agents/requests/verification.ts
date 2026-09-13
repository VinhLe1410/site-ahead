import { v } from "convex/values";
import { components } from "../../_generated/api";
import { internalQuery } from "../../_generated/server";
import { schema } from "../../schema";

// Read-only acceptance inspection of the preserved personal-development demo.
// No fixture creation, arbitrary storage lookup, or model invocation is exposed.
export const inspect = internalQuery({
  args: { jobId: v.id("jobs") },
  returns: v.object({
    job: schema.doc("jobs"),
    items: v.array(schema.doc("checklistItems")),
    states: v.array(schema.doc("checklistAgentStates")),
    outputs: v.array(
      v.object({
        itemId: v.id("checklistItems"),
        tools: v.array(v.string()),
        draftUrl: v.union(v.string(), v.null()),
        sourceUrl: v.union(v.string(), v.null()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const job = await ctx.db.get("jobs", args.jobId);

    const organization = job
      ? await ctx.db.get("organizations", job.organizationId)
      : null;

    if (!job || organization?.name !== "Agent implementation QA")
      throw new Error(
        "Only the preserved personal-development QA job may be inspected.",
      );

    const items = await ctx.db
      .query("checklistItems")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .take(100);

    const states = await ctx.db
      .query("checklistAgentStates")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .take(100);

    const outputs = [];

    for (const state of states) {
      if (
        !items.some(
          (item) => item._id === state.itemId && item.kind === "third_party",
        )
      )
        continue;
      const tools = [];

      if (state.threadId) {
        const messages = await ctx.runQuery(
          components.agent.messages.listMessagesByThreadId,
          {
            threadId: state.threadId,
            order: "desc",
            paginationOpts: { cursor: null, numItems: 30 },
          },
        );

        for (const message of [...messages.page].reverse()) {
          const content = message.message?.content;

          if (!Array.isArray(content)) continue;

          for (const part of content)
            if (part.type === "tool-call") tools.push(part.toolName);
        }
      }

      const version = state.draft
        ? await ctx.db.get("documentVersions", state.draft.sourceVersionId)
        : null;

      const document = version
        ? await ctx.db.get("documents", version.documentId)
        : null;

      outputs.push({
        itemId: state.itemId,
        tools,
        draftUrl: state.draft
          ? await ctx.storage.getUrl(state.draft.storageId)
          : null,
        sourceUrl:
          version && document?.organizationId === job.organizationId
            ? await ctx.storage.getUrl(version.storageId)
            : null,
      });
    }

    return { job, items, states, outputs };
  },
});
