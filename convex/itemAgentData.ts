export {
  itemSnapshot,
  classificationSnapshot,
  executionSnapshot,
} from "../shared/item-agent-snapshots";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { components } from "./_generated/api";

export async function itemAgentState(
  db: QueryCtx["db"],
  itemId: Id<"checklistItems">,
) {
  return await db
    .query("checklistAgentStates")
    .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
    .unique();
}

// Called in the human edit transaction, so editing then reverting cannot revive a run.
export async function invalidateItemWork(
  ctx: MutationCtx,
  itemId: Id<"checklistItems">,
) {
  const state = await itemAgentState(ctx.db, itemId);

  if (state === null) return;

  const classification =
    state.classification.status === "running"
      ? {
          ...state.classification,
          status: "failed" as const,
          error: "saved_context_changed",
        }
      : state.classification;

  if (state.execution === "running" || state.queued) {
    // Keep the running lease until its worker/watchdog ends; immediate retry must not overlap.
    await ctx.db.patch("checklistAgentStates", state._id, {
      classification,
      queued: false,
      execution: state.execution === "running" ? "running" : "failed",
      snapshot: undefined,
      error: "saved_context_changed",
      nextAction:
        state.execution === "running"
          ? "Saved information changed. Wait for this run to stop, then retry."
          : "Saved information changed. Retry this item using its current information.",
      updatedAt: Date.now(),
    });
  } else if (state.classification.status === "running") {
    await ctx.db.patch("checklistAgentStates", state._id, {
      classification,
      updatedAt: Date.now(),
    });
  }
}

export async function removeItemWork(
  ctx: MutationCtx,
  itemId: Id<"checklistItems">,
) {
  const state = await itemAgentState(ctx.db, itemId);

  if (state === null) return;

  if (state.draft !== undefined)
    await ctx.storage.delete(state.draft.storageId);

  if (state.threadId !== undefined)
    await ctx.scheduler.runAfter(
      0,
      components.agent.threads.deleteAllForThreadIdAsync,
      {
        threadId: state.threadId,
        limit: 20,
      },
    );
  await ctx.db.delete("checklistAgentStates", state._id);
}
