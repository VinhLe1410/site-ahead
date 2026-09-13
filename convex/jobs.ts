import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwnedCategory, requireOwnedJob, requireUserId } from "./access";
import { jobStatusValidator, requireText } from "./contracts";
import { schema } from "./schema";

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
    const ownerId = await requireUserId(ctx);

    const category =
      args.categoryId === null
        ? null
        : await requireOwnedCategory(ctx.db, args.categoryId, ownerId);

    const processedText = requireText(args.processedText, "Processed text");
    const addressText = requireText(args.addressText, "Address");

    const inputId = await ctx.db.insert("inputs", {
      ownerId,
      processedText,
      addressText,
    });

    const jobId =
      category === null
        ? await ctx.db.insert("jobs", {
            ownerId,
            inputId,
            addressText,
            status: "pending",
          })
        : await ctx.db.insert("jobs", {
            ownerId,
            inputId,
            categoryId: category._id,
            addressText,
            status: "pending",
          });

    const checklist = category === null ? [] : category.checklist;

    for (const item of checklist) {
      await ctx.db.insert("checklistItems", {
        jobId,
        title: item.title,
        kind: item.kind,
        status: "pending",
        notes: "",
      });
    }

    return jobId;
  },
});

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(jobListItemValidator),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);

    const result = await ctx.db
      .query("jobs")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (job) => {
        if (job.categoryId === undefined) {
          return { job, categoryTitle: null };
        }

        const category = await ctx.db.get("categories", job.categoryId);

        if (category === null || category.ownerId !== ownerId) {
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
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    const jobId = ctx.db.normalizeId("jobs", args.jobId);

    if (jobId === null) {
      return null;
    }

    const job = await ctx.db.get("jobs", jobId);

    if (job === null || job.ownerId !== ownerId) {
      return null;
    }

    const [input, checklist] = await Promise.all([
      ctx.db.get("inputs", job.inputId),
      ctx.db
        .query("checklistItems")
        .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
        .take(101),
    ]);

    if (input === null || input.ownerId !== ownerId) {
      throw new Error("Job input not found");
    }

    let categoryTitle = null;

    if (job.categoryId !== undefined) {
      const category = await ctx.db.get("categories", job.categoryId);

      if (category === null || category.ownerId !== ownerId) {
        throw new Error("Job category not found");
      }

      categoryTitle = category.title;
    }

    if (checklist.length > 100) {
      throw new Error("Job checklist exceeds its supported size");
    }

    return { job, input, categoryTitle, checklist };
  },
});

export const setStatus = mutation({
  args: { jobId: v.id("jobs"), status: jobStatusValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    await requireOwnedJob(ctx.db, args.jobId, ownerId);
    await ctx.db.patch("jobs", args.jobId, { status: args.status });

    return null;
  },
});
