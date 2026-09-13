import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireOwnedChecklistItem, requireUserId } from "./access";
import { checklistItemStatusValidator } from "./contracts";

export const setStatus = mutation({
  args: {
    itemId: v.id("checklistItems"),
    status: checklistItemStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    await requireOwnedChecklistItem(ctx.db, args.itemId, ownerId);
    await ctx.db.patch("checklistItems", args.itemId, { status: args.status });

    return null;
  },
});

export const setNotes = mutation({
  args: { itemId: v.id("checklistItems"), notes: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    await requireOwnedChecklistItem(ctx.db, args.itemId, ownerId);
    await ctx.db.patch("checklistItems", args.itemId, { notes: args.notes });

    return null;
  },
});
