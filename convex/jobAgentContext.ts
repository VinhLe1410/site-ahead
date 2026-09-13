import { ConvexError, v, type Infer } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  getMembership,
  requireMembership,
  requireOrganizationJob,
} from "./access";
import {
  jobAgentFieldsValidator,
  validateConstructionYear,
} from "./agentContracts";
import { schema } from "./schema";
import {
  executionSnapshot,
  invalidateItemWork,
  itemAgentState,
} from "./itemAgentData";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const itemContextValidator = v.object({
  item: schema.doc("checklistItems"),
  job: schema.doc("jobs"),
  input: schema.doc("inputs"),
  category: v.union(schema.doc("categories"), v.null()),
});

export type ItemContext = Infer<typeof itemContextValidator>;

export async function loadItemContext(
  db: QueryCtx["db"],
  item: Doc<"checklistItems">,
): Promise<ItemContext | null> {
  const job = await db.get("jobs", item.jobId);

  if (job === null) return null;
  const input = await db.get("inputs", job.inputId);

  if (input === null || input.organizationId !== job.organizationId)
    return null;

  const category =
    job.categoryId === undefined
      ? null
      : await db.get("categories", job.categoryId);

  if (
    job.categoryId !== undefined &&
    (category === null || category.organizationId !== job.organizationId)
  )
    return null;

  return { item, job, input, category };
}

export const get = internalQuery({
  args: { itemId: v.id("checklistItems"), initiatedBy: v.id("users") },
  returns: v.union(itemContextValidator, v.null()),
  handler: async (ctx, args) => {
    const item = await ctx.db.get("checklistItems", args.itemId);

    if (item === null) return null;
    const context = await loadItemContext(ctx.db, item);
    const membership = await getMembership(ctx.db, args.initiatedBy);

    if (
      context === null ||
      membership?.state !== "active" ||
      membership.organizationId !== context.job.organizationId
    )
      return null;

    return context;
  },
});

async function invalidateChangedContext(
  ctx: MutationCtx,
  jobId: Id<"jobs">,
  patch: Partial<Doc<"jobs">>,
) {
  const items = await ctx.db
    .query("checklistItems")
    .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
    .take(100);

  for (const item of items) {
    const state = await itemAgentState(ctx.db, item._id);

    if (state?.execution !== "running" && !state?.queued) continue;
    const context = await loadItemContext(ctx.db, item);

    if (
      context !== null &&
      executionSnapshot(context) !==
        executionSnapshot({ ...context, job: { ...context.job, ...patch } })
    )
      await invalidateItemWork(ctx, item._id);
  }
}

export const setConstructionYear = mutation({
  args: { jobId: v.id("jobs"), year: v.union(v.number(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx);
    await requireOrganizationJob(ctx.db, args.jobId, membership.organizationId);
    const suppliedAt = Date.now();

    const confirmedConstructionYear =
      args.year === null
        ? undefined
        : {
            year: validateConstructionYear(args.year, suppliedAt),
            suppliedBy: membership.userId,
            suppliedAt,
          };

    await invalidateChangedContext(ctx, args.jobId, {
      confirmedConstructionYear,
    });
    await ctx.db.patch("jobs", args.jobId, { confirmedConstructionYear });

    return null;
  },
});

export const setFields = mutation({
  args: { jobId: v.id("jobs"), fields: jobAgentFieldsValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx);
    await requireOrganizationJob(ctx.db, args.jobId, membership.organizationId);
    const fields = { ...args.fields };

    const { latitude, longitude } = fields;

    if ((latitude === undefined) !== (longitude === undefined))
      throw new ConvexError("Provide both latitude and longitude, or neither.");

    if (
      latitude !== undefined &&
      (!Number.isFinite(latitude) || latitude < -39.2 || latitude > -33.9)
    )
      throw new ConvexError("Provide a site latitude within Victoria.");

    if (
      longitude !== undefined &&
      (!Number.isFinite(longitude) || longitude < 140.9 || longitude > 149.1)
    )
      throw new ConvexError("Provide a site longitude within Victoria.");

    const textFields = [
      "roadName",
      "locality",
      "contractorName",
      "contractorEmail",
      "contractorPhone",
      "contractorLicence",
      "clientName",
      "clientEmail",
      "inspectorName",
      "inspectorEmail",
      "siteAccess",
      "plannedStartDate",
    ] as const;

    for (const key of textFields) {
      const value = fields[key]?.trim();

      if (value !== undefined && value.length > 500)
        throw new ConvexError(
          "Each job information field must be 500 characters or fewer.",
        );
      fields[key] = value === "" ? undefined : value;
    }

    for (const email of [
      fields.contractorEmail,
      fields.clientEmail,
      fields.inspectorEmail,
    ]) {
      if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new ConvexError("Provide a valid email address.");
    }

    if (fields.plannedStartDate !== undefined) {
      const date = new Date(`${fields.plannedStartDate}T00:00:00.000Z`);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(fields.plannedStartDate) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== fields.plannedStartDate
      )
        throw new ConvexError(
          "Provide a valid planned start date as YYYY-MM-DD.",
        );
    }

    const agentContext = {
      ...fields,
      suppliedBy: membership.userId,
      suppliedAt: Date.now(),
    };

    await invalidateChangedContext(ctx, args.jobId, { agentContext });
    await ctx.db.patch("jobs", args.jobId, { agentContext });

    return null;
  },
});
