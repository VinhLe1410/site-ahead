import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireOrganizationCategory,
  requireMembership,
  activeMembership,
} from "./access";
import {
  requireText,
  templateItemValidator,
  validateTemplate,
} from "./contracts";
import { schema } from "./schema";
import {
  documentSummaryValidator,
  templateDocuments,
  templateDocumentVersions,
} from "./documentData";

const categoryFields = {
  title: v.string(),
  checklist: v.array(templateItemValidator),
};

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("categories")),
  handler: async (ctx, args) => {
    const membership = await activeMembership(ctx);

    if (membership === null)
      return { page: [], isDone: true, continueCursor: "" };
    const { organizationId } = membership;

    return await ctx.db
      .query("categories")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const get = query({
  args: { categoryId: v.string() },
  returns: v.union(
    schema
      .doc("categories")
      .extend({ documents: v.array(documentSummaryValidator) }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const membership = await activeMembership(ctx);

    if (membership === null) return null;
    const { organizationId } = membership;
    const categoryId = ctx.db.normalizeId("categories", args.categoryId);

    if (categoryId === null) {
      return null;
    }

    const category = await ctx.db.get("categories", categoryId);

    if (category === null || category.organizationId !== organizationId)
      return null;

    return {
      ...category,
      documents: await templateDocuments(
        ctx.db,
        organizationId,
        category.checklist,
      ),
    };
  },
});

export const create = mutation({
  args: categoryFields,
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);
    const checklist = validateTemplate(args.checklist);

    await templateDocumentVersions(ctx.db, organizationId, checklist);

    return await ctx.db.insert("categories", {
      organizationId,
      title: requireText(args.title, "Category title"),
      checklist,
    });
  },
});

export const update = mutation({
  args: { categoryId: v.id("categories"), ...categoryFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);
    await requireOrganizationCategory(ctx.db, args.categoryId, organizationId);
    const checklist = validateTemplate(args.checklist);

    await templateDocumentVersions(ctx.db, organizationId, checklist);
    await ctx.db.patch("categories", args.categoryId, {
      title: requireText(args.title, "Category title"),
      checklist,
    });

    return null;
  },
});

export const remove = mutation({
  args: { categoryId: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);
    await requireOrganizationCategory(ctx.db, args.categoryId, organizationId);

    const job = await ctx.db
      .query("jobs")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .first();

    if (job !== null)
      throw new ConvexError(
        "Reassign every job using this category or make those jobs Uncategorized before deleting it. Their checklists will stay unchanged.",
      );
    await ctx.db.delete("categories", args.categoryId);

    return null;
  },
});
