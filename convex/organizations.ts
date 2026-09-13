import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getMembership,
  getRollout,
  requireOwner,
  requireReady,
  requireUserId,
} from "./access";
import { requireText } from "./contracts";
import { schema } from "./schema";

export const current = query({
  args: {},
  returns: v.union(
    v.object({ state: v.literal("maintenance") }),
    v.object({ state: v.literal("onboarding") }),
    v.object({ state: v.literal("removed") }),
    v.object({
      state: v.literal("active"),
      membership: schema.doc("memberships"),
      organization: schema.doc("organizations"),
    }),
  ),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rollout = await getRollout(ctx.db);

    if (rollout?.phase !== "ready") return { state: "maintenance" as const };
    const membership = await getMembership(ctx.db, userId);

    if (membership === null) return { state: "onboarding" as const };

    if (membership.state === "removed") return { state: "removed" as const };

    const organization = await ctx.db.get(
      "organizations",
      membership.organizationId,
    );

    if (organization === null) throw new Error("Member organization not found");

    return { state: "active" as const, membership, organization };
  },
});

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireReady(ctx.db);
    const membership = await getMembership(ctx.db, userId);

    if (membership?.state === "active")
      throw new ConvexError("You already belong to an organization.");

    const organizationId = await ctx.db.insert("organizations", {
      name: requireText(args.name, "Organization name"),
    });

    const values = {
      userId,
      organizationId,
      role: "owner" as const,
      state: "active" as const,
    };

    if (membership === null) await ctx.db.insert("memberships", values);
    else await ctx.db.replace("memberships", membership._id, values);

    return organizationId;
  },
});

export const rename = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireOwner(ctx);
    await ctx.db.patch("organizations", organizationId, {
      name: requireText(args.name, "Organization name"),
    });

    return null;
  },
});

export const members = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      membership: schema.doc("memberships"),
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const { organizationId } = await requireOwner(ctx);

    const result = await ctx.db
      .query("memberships")
      .withIndex("by_organizationId_and_state", (q) =>
        q.eq("organizationId", organizationId).eq("state", "active"),
      )
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (membership) => {
        const user = await ctx.db.get("users", membership.userId);

        if (user === null) throw new Error("Member account not found");

        return {
          membership,
          name: user.name ?? null,
          email: user.email ?? null,
        };
      }),
    );

    return { ...result, page };
  },
});

export const removeStaff = mutation({
  args: { membershipId: v.id("memberships") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx);
    const member = await ctx.db.get("memberships", args.membershipId);

    if (
      member === null ||
      member.organizationId !== owner.organizationId ||
      member.state !== "active"
    )
      throw new ConvexError("Member not found");

    if (member.role === "owner")
      throw new ConvexError("The owner cannot be removed.");
    await ctx.db.patch("memberships", member._id, { state: "removed" });

    return null;
  },
});
