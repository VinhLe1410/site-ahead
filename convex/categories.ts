import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwnedCategory, requireUserId } from "./access";
import {
  requireText,
  templateItemValidator,
  validateTemplate,
} from "./contracts";
import { schema } from "./schema";

const categoryFields = {
  title: v.string(),
  checklist: v.array(templateItemValidator),
};

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("categories")),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);

    return await ctx.db
      .query("categories")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const get = query({
  args: { categoryId: v.string() },
  returns: v.union(schema.doc("categories"), v.null()),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    const categoryId = ctx.db.normalizeId("categories", args.categoryId);

    if (categoryId === null) {
      return null;
    }

    const category = await ctx.db.get("categories", categoryId);

    return category?.ownerId === ownerId ? category : null;
  },
});

export const create = mutation({
  args: categoryFields,
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);

    return await ctx.db.insert("categories", {
      ownerId,
      title: requireText(args.title, "Category title"),
      checklist: validateTemplate(args.checklist),
    });
  },
});

export const update = mutation({
  args: { categoryId: v.id("categories"), ...categoryFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    await requireOwnedCategory(ctx.db, args.categoryId, ownerId);
    await ctx.db.patch("categories", args.categoryId, {
      title: requireText(args.title, "Category title"),
      checklist: validateTemplate(args.checklist),
    });

    return null;
  },
});
