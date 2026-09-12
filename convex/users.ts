import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { schema } from "./schema";

export const currentUser = query({
  args: {},
  returns: schema.doc("users"),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get("users", userId);

    if (user === null) {
      throw new Error("Authenticated user no longer exists");
    }

    return user;
  },
});
