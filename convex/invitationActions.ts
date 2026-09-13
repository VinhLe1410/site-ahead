import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { schema } from "./schema";

function invitationToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export const create = action({
  args: { email: v.string() },
  returns: schema.doc("invitations"),
  handler: async (ctx, args): Promise<Doc<"invitations">> =>
    await ctx.runMutation(internal.invitations.createWithToken, {
      ...args,
      token: invitationToken(),
    }),
});

export const renew = action({
  args: { invitationId: v.id("invitations") },
  returns: schema.doc("invitations"),
  handler: async (ctx, args): Promise<Doc<"invitations">> =>
    await ctx.runMutation(internal.invitations.renewWithToken, {
      ...args,
      token: invitationToken(),
    }),
});
