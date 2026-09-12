import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { normalizeReturnTo } from "../shared/auth";
import { env } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      const origin = new URL(env.SITE_URL).origin;

      return origin + normalizeReturnTo(redirectTo, origin);
    },
  },
});
