import { invalidateItemWork } from "./itemAgentData";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireOrganizationChecklistItem, requireMembership } from "./access";
import { checklistItemStatusValidator } from "./contracts";

export const setStatus = mutation({
  args: {
    itemId: v.id("checklistItems"),
    status: checklistItemStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);
    await requireOrganizationChecklistItem(ctx.db, args.itemId, organizationId);
    await invalidateItemWork(ctx, args.itemId);
    await ctx.db.patch("checklistItems", args.itemId, { status: args.status });

    return null;
  },
});

export const setNotes = mutation({
  args: { itemId: v.id("checklistItems"), notes: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);
    await requireOrganizationChecklistItem(ctx.db, args.itemId, organizationId);
    await invalidateItemWork(ctx, args.itemId);
    await ctx.db.patch("checklistItems", args.itemId, { notes: args.notes });

    return null;
  },
});
