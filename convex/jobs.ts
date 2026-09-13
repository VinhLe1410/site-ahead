import { internal } from "./_generated/api";
import { invalidateItemWork, removeItemWork } from "./itemAgentData";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireOrganizationCategory,
  requireOrganizationJob,
  requireMembership,
  activeMembership,
} from "./access";
import { jobStatusValidator, requireText } from "./contracts";
import { schema } from "./schema";
import {
  checklistDocuments,
  documentSummaryValidator,
  templateDocumentVersions,
} from "./documentData";

const jobListItemValidator = v.object({
  job: schema.doc("jobs"),
  categoryTitle: v.union(v.string(), v.null()),
});

export const create = mutation({
  args: {
    processedText: v.string(),
    addressText: v.string(),
    categoryId: v.union(v.id("categories"), v.null()),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const { organizationId, userId } = await requireMembership(ctx);

    const category =
      args.categoryId === null
        ? null
        : await requireOrganizationCategory(
            ctx.db,
            args.categoryId,
            organizationId,
          );

    const processedText = requireText(args.processedText, "Processed text");
    const addressText = requireText(args.addressText, "Address");

    const checklist = await templateDocumentVersions(
      ctx.db,
      organizationId,
      category?.checklist ?? [],
    );

    const inputId = await ctx.db.insert("inputs", {
      organizationId,
      processedText,
      addressText,
    });

    const jobId =
      category === null
        ? await ctx.db.insert("jobs", {
            organizationId,
            inputId,
            addressText,
            status: "pending",
          })
        : await ctx.db.insert("jobs", {
            organizationId,
            inputId,
            categoryId: category._id,
            addressText,
            status: "pending",
          });

    for (const item of checklist) {
      await ctx.db.insert("checklistItems", {
        jobId,
        title: item.title,
        kind: item.kind,
        status: "pending",
        notes: "",
        documentVersionIds: item.documentVersionIds,
      });
    }

    const items = await ctx.db
      .query("checklistItems")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .take(100);

    if (items.length > 0)
      await ctx.scheduler.runAfter(
        0,
        internal.agents.checklist.processChecklist.run,
        { items, initiatedBy: userId },
      );

    return jobId;
  },
});

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(jobListItemValidator),
  handler: async (ctx, args) => {
    const membership = await activeMembership(ctx);

    if (membership === null)
      return { page: [], isDone: true, continueCursor: "" };
    const { organizationId } = membership;

    const result = await ctx.db
      .query("jobs")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (job) => {
        if (job.categoryId === undefined) {
          return { job, categoryTitle: null };
        }

        const category = await ctx.db.get("categories", job.categoryId);

        if (category === null || category.organizationId !== organizationId) {
          throw new Error("Job category not found");
        }

        return { job, categoryTitle: category.title };
      }),
    );

    return { ...result, page };
  },
});

export const get = query({
  args: { jobId: v.string() },
  returns: v.union(
    v.object({
      job: schema.doc("jobs"),
      input: schema.doc("inputs"),
      categoryTitle: v.union(v.string(), v.null()),
      checklist: v.array(schema.doc("checklistItems")),
      documents: v.array(documentSummaryValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const membership = await activeMembership(ctx);

    if (membership === null) return null;
    const { organizationId } = membership;
    const jobId = ctx.db.normalizeId("jobs", args.jobId);

    if (jobId === null) {
      return null;
    }

    const job = await ctx.db.get("jobs", jobId);

    if (job === null || job.organizationId !== organizationId) {
      return null;
    }

    const [input, checklist] = await Promise.all([
      ctx.db.get("inputs", job.inputId),
      ctx.db
        .query("checklistItems")
        .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
        .take(101),
    ]);

    if (input === null || input.organizationId !== organizationId) {
      throw new Error("Job input not found");
    }

    let categoryTitle = null;

    if (job.categoryId !== undefined) {
      const category = await ctx.db.get("categories", job.categoryId);

      if (category === null || category.organizationId !== organizationId) {
        throw new Error("Job category not found");
      }

      categoryTitle = category.title;
    }

    if (checklist.length > 100) {
      throw new Error("Job checklist exceeds its supported size");
    }

    return {
      job,
      input,
      categoryTitle,
      checklist,
      documents: await checklistDocuments(ctx.db, organizationId, checklist),
    };
  },
});

export const setStatus = mutation({
  args: { jobId: v.id("jobs"), status: jobStatusValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);
    await requireOrganizationJob(ctx.db, args.jobId, organizationId);
    await ctx.db.patch("jobs", args.jobId, { status: args.status });

    return null;
  },
});

export const update = mutation({
  args: {
    jobId: v.id("jobs"),
    processedText: v.string(),
    addressText: v.string(),
    categoryId: v.union(v.id("categories"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);

    const job = await requireOrganizationJob(
      ctx.db,
      args.jobId,
      organizationId,
    );

    if (args.categoryId !== null)
      await requireOrganizationCategory(
        ctx.db,
        args.categoryId,
        organizationId,
      );
    const processedText = requireText(args.processedText, "Processed text");
    const addressText = requireText(args.addressText, "Address");
    const input = await ctx.db.get("inputs", job.inputId);

    if (input === null || input.organizationId !== organizationId)
      throw new ConvexError("Job input not found");

    const references = await ctx.db
      .query("jobs")
      .withIndex("by_inputId", (q) => q.eq("inputId", input._id))
      .take(2);

    const items = await ctx.db
      .query("checklistItems")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .take(100);

    for (const item of items) await invalidateItemWork(ctx, item._id);

    // Legacy imports may share an input. Editing one job must preserve the other.
    let inputId = input._id;

    if (references.length > 1)
      inputId = await ctx.db.insert("inputs", {
        organizationId,
        processedText,
        addressText,
      });
    else await ctx.db.patch("inputs", inputId, { processedText, addressText });
    await ctx.db.patch("jobs", job._id, {
      inputId,
      addressText,
      categoryId: args.categoryId ?? undefined,
    });

    return null;
  },
});

export const remove = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);

    const job = await requireOrganizationJob(
      ctx.db,
      args.jobId,
      organizationId,
    );

    const input = await ctx.db.get("inputs", job.inputId);

    if (input === null || input.organizationId !== organizationId)
      throw new ConvexError("Job input not found");

    const checklist = await ctx.db
      .query("checklistItems")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .take(101);

    if (checklist.length > 100)
      throw new ConvexError("Job checklist exceeds its supported size");

    for (const item of checklist) {
      await removeItemWork(ctx, item._id);
      await ctx.db.delete("checklistItems", item._id);
    }

    await ctx.db.delete("jobs", job._id);

    const remaining = await ctx.db
      .query("jobs")
      .withIndex("by_inputId", (q) => q.eq("inputId", job.inputId))
      .first();

    if (remaining === null) await ctx.db.delete("inputs", job.inputId);

    return null;
  },
});
