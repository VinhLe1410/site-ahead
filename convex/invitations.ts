import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  getMembership,
  requireOwner,
  requireUserId,
  verifiedEmail,
} from "./access";
import { schema } from "./schema";

const INVITATION_LIFETIME = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ConvexError("Enter a valid Google account email.");

  return email;
}

async function checkRecipient(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  email: string,
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_normalizedEmail", (q) => q.eq("normalizedEmail", email))
    .unique();

  if (user !== null) {
    const membership = await getMembership(ctx.db, user._id);

    if (membership?.state === "active")
      throw new ConvexError("This account already belongs to an organization.");
  }

  const pending = await ctx.db
    .query("invitations")
    .withIndex("by_organizationId_and_email_and_status", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("email", email)
        .eq("status", "pending"),
    )
    .unique();

  if (pending !== null) {
    if (pending.expiresAt > Date.now())
      throw new ConvexError(
        "A pending invitation already exists for this email.",
      );
    await ctx.db.patch("invitations", pending._id, { status: "expired" });
  }
}

export const createWithToken = internalMutation({
  args: { email: v.string(), token: v.string() },
  returns: schema.doc("invitations"),
  handler: async (ctx, args) => {
    const { organizationId } = await requireOwner(ctx);
    const email = normalizeEmail(args.email);
    await checkRecipient(ctx, organizationId, email);
    const expiresAt = Date.now() + INVITATION_LIFETIME;

    const invitationId = await ctx.db.insert("invitations", {
      organizationId,
      email,
      token: args.token,
      status: "pending",
      expiresAt,
    });

    await ctx.scheduler.runAt(expiresAt, internal.invitations.expire, {
      invitationId,
      token: args.token,
      expiresAt,
    });
    const invitation = await ctx.db.get("invitations", invitationId);

    if (invitation === null) throw new Error("Created invitation not found");

    return invitation;
  },
});

export const renewWithToken = internalMutation({
  args: { invitationId: v.id("invitations"), token: v.string() },
  returns: schema.doc("invitations"),
  handler: async (ctx, args) => {
    const { organizationId } = await requireOwner(ctx);
    const invitation = await ctx.db.get("invitations", args.invitationId);

    if (invitation === null || invitation.organizationId !== organizationId)
      throw new ConvexError("Invitation not found");

    if (
      invitation.status !== "expired" &&
      !(invitation.status === "pending" && invitation.expiresAt <= Date.now())
    )
      throw new ConvexError("Only expired invitations can be renewed.");
    await checkRecipient(ctx, organizationId, invitation.email);
    const expiresAt = Date.now() + INVITATION_LIFETIME;

    const updated = {
      ...invitation,
      token: args.token,
      expiresAt,
      status: "pending" as const,
    };

    await ctx.db.patch("invitations", invitation._id, {
      token: args.token,
      expiresAt,
      status: "pending",
    });
    await ctx.scheduler.runAt(expiresAt, internal.invitations.expire, {
      invitationId: invitation._id,
      token: args.token,
      expiresAt,
    });

    return updated;
  },
});

export const expire = internalMutation({
  args: {
    invitationId: v.id("invitations"),
    token: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get("invitations", args.invitationId);

    if (
      invitation !== null &&
      invitation.status === "pending" &&
      invitation.token === args.token &&
      invitation.expiresAt === args.expiresAt &&
      invitation.expiresAt <= Date.now()
    ) {
      await ctx.db.patch("invitations", invitation._id, { status: "expired" });
    }

    return null;
  },
});

export const list = query({
  args: {
    status: v.union(v.literal("pending"), v.literal("expired")),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(schema.doc("invitations")),
  handler: async (ctx, args) => {
    const { organizationId } = await requireOwner(ctx);

    return await ctx.db
      .query("invitations")
      .withIndex("by_organizationId_and_status", (q) =>
        q.eq("organizationId", organizationId).eq("status", args.status),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const revoke = mutation({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireOwner(ctx);
    const invitation = await ctx.db.get("invitations", args.invitationId);

    if (invitation === null || invitation.organizationId !== organizationId)
      throw new ConvexError("Invitation not found");

    if (invitation.status !== "pending" && invitation.status !== "expired")
      throw new ConvexError(
        "This invitation is no longer pending. Remove the member if it was accepted.",
      );
    await ctx.db.patch("invitations", invitation._id, { status: "revoked" });

    return null;
  },
});

export const pendingForMe = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      invitation: schema.doc("invitations"),
      organizationName: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const email = await verifiedEmail(ctx);

    if (email === null) return { page: [], isDone: true, continueCursor: "" };

    const result = await ctx.db
      .query("invitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", email).eq("status", "pending"),
      )
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (invitation) => {
        const organization = await ctx.db.get(
          "organizations",
          invitation.organizationId,
        );

        if (organization === null)
          throw new Error("Inviting organization not found");

        return { invitation, organizationName: organization.name };
      }),
    );

    return { ...result, page };
  },
});

export const lookup = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      state: v.union(
        v.literal("invalid"),
        v.literal("verification_required"),
        v.literal("wrong_account"),
        v.literal("expired"),
        v.literal("revoked"),
        v.literal("declined"),
        v.literal("used"),
        v.literal("already_member"),
        v.literal("joined"),
      ),
    }),
    v.object({ state: v.literal("pending"), organizationName: v.string() }),
  ),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (invitation === null) return { state: "invalid" as const };
    const email = await verifiedEmail(ctx);

    if (email === null) return { state: "verification_required" as const };

    if (email !== invitation.email) return { state: "wrong_account" as const };
    const membership = await getMembership(ctx.db, userId);

    if (invitation.status === "accepted") {
      return {
        state:
          invitation.acceptedUserId === userId &&
          membership?.state === "active" &&
          membership.organizationId === invitation.organizationId
            ? ("joined" as const)
            : ("used" as const),
      };
    }

    if (invitation.status !== "pending") return { state: invitation.status };

    if (membership?.state === "active")
      return { state: "already_member" as const };

    const organization = await ctx.db.get(
      "organizations",
      invitation.organizationId,
    );

    if (organization === null)
      throw new Error("Inviting organization not found");

    return { state: "pending" as const, organizationName: organization.name };
  },
});

export const accept = mutation({
  args: { token: v.string() },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const email = await verifiedEmail(ctx);

    if (email === null)
      throw new ConvexError("Sign in again with Google to verify your email.");

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (invitation === null || invitation.email !== email)
      throw new ConvexError(
        "This invitation is unavailable for this Google account.",
      );
    const membership = await getMembership(ctx.db, userId);

    if (
      invitation.status === "accepted" &&
      invitation.acceptedUserId === userId &&
      membership?.state === "active" &&
      membership.organizationId === invitation.organizationId
    )
      return invitation.organizationId;

    if (invitation.status !== "pending" || invitation.expiresAt <= Date.now())
      throw new ConvexError(
        "This invitation is no longer available. Ask the owner for a new link.",
      );

    if (membership?.state === "active")
      throw new ConvexError(
        "You already belong to an organization. You can only join one.",
      );

    const values = {
      userId,
      organizationId: invitation.organizationId,
      role: "staff" as const,
      state: "active" as const,
    };

    if (membership === null) await ctx.db.insert("memberships", values);
    else await ctx.db.replace("memberships", membership._id, values);
    await ctx.db.patch("invitations", invitation._id, {
      status: "accepted",
      acceptedUserId: userId,
    });

    return invitation.organizationId;
  },
});

export const decline = mutation({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = await verifiedEmail(ctx);
    const invitation = await ctx.db.get("invitations", args.invitationId);

    if (email === null || invitation === null || invitation.email !== email)
      throw new ConvexError("Invitation not found");

    if (invitation.status !== "pending" || invitation.expiresAt <= Date.now())
      throw new ConvexError("This invitation is no longer pending.");
    await ctx.db.patch("invitations", invitation._id, { status: "declined" });

    return null;
  },
});
