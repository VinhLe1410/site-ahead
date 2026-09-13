import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import { schema } from "../../schema";

const fixtureName = "Site Ahead isolated classification verification";

export const prepare = internalMutation({
  args: {},
  returns: v.object({
    organizationId: v.id("organizations"),
    initiatedBy: v.id("users"),
    items: v.array(schema.doc("checklistItems")),
  }),
  handler: async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      name: fixtureName,
    });

    const initiatedBy = await ctx.db.insert("users", { name: fixtureName });
    await ctx.db.insert("memberships", {
      organizationId,
      userId: initiatedBy,
      role: "owner",
      state: "active",
    });

    const inputId = await ctx.db.insert("inputs", {
      organizationId,
      addressText: "123 Fictional Demo Road",
      processedText:
        "Fictional renovation verification; no real customer data.",
    });

    const categoryId = await ctx.db.insert("categories", {
      organizationId,
      title: "Carpentry & Renovation",
      checklist: [],
    });

    const jobId = await ctx.db.insert("jobs", {
      organizationId,
      inputId,
      categoryId,
      addressText: "123 Fictional Demo Road",
      status: "pending",
    });

    for (const title of [
      "Construction year of the property (pre/post 1990)",
      "Asbestos disturbance assessment",
      "Air Quality",
      "Road Closure",
      "Building permit + registered building surveyor appointed",
      "Occupancy Permit / Certificate of Final Inspection on completion",
    ])
      await ctx.db.insert("checklistItems", {
        jobId,
        title,
        kind: "on_site",
        status: "pending",
        notes: "Verification note",
      });
    await ctx.db.insert("checklistItems", {
      jobId,
      title: "Completed manual item",
      kind: "on_site",
      status: "done",
      notes: "Preserve this completed item",
    });

    const items = await ctx.db
      .query("checklistItems")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .take(10);

    return { organizationId, initiatedBy, items };
  },
});

export const inspect = internalQuery({
  args: { jobId: v.id("jobs") },
  returns: v.object({
    items: v.array(schema.doc("checklistItems")),
    states: v.array(schema.doc("checklistAgentStates")),
  }),
  handler: async (ctx, args) => ({
    items: await ctx.db
      .query("checklistItems")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(100),
    states: await ctx.db
      .query("checklistAgentStates")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(100),
  }),
});

export const cleanup = internalMutation({
  args: { organizationId: v.id("organizations"), initiatedBy: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const organization = await ctx.db.get("organizations", args.organizationId);
    const user = await ctx.db.get("users", args.initiatedBy);

    if (organization?.name !== fixtureName || user?.name !== fixtureName)
      throw new Error("Only isolated verification fixtures can be removed.");

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_organizationId_and_state", (q) =>
        q.eq("organizationId", args.organizationId).eq("state", "active"),
      )
      .take(2);

    if (memberships.length !== 1 || memberships[0].userId !== args.initiatedBy)
      throw new Error("Verification fixture membership changed.");

    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(2);

    if (jobs.length !== 1)
      throw new Error("Verification fixture jobs changed.");
    const job = jobs[0];

    const items = await ctx.db
      .query("checklistItems")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .take(10);

    const states = await ctx.db
      .query("checklistAgentStates")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .take(10);

    if (states.some((state) => state.threadId !== undefined))
      throw new Error(
        "This fixture contains execution threads; automatic cleanup refused.",
      );

    for (const state of states)
      await ctx.db.delete("checklistAgentStates", state._id);

    for (const item of items) await ctx.db.delete("checklistItems", item._id);
    await ctx.db.delete("jobs", job._id);
    await ctx.db.delete("inputs", job.inputId);

    if (job.categoryId !== undefined)
      await ctx.db.delete("categories", job.categoryId);
    await ctx.db.delete("memberships", memberships[0]._id);
    await ctx.db.delete("users", user._id);
    await ctx.db.delete("organizations", organization._id);

    return null;
  },
});
