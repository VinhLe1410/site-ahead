/// <reference types="node" />

import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { normalizeReturnTo } from "../shared/auth";
import { previewOriginVariable } from "../shared/preview";
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
      let destination: URL;

      try {
        destination = new URL(redirectTo, origin);
      } catch {
        return `${origin}/app`;
      }

      if (redirectTo.startsWith("//")) {
        return `${origin}/app`;
      }

      if (destination.origin !== origin) {
        if (env.AUTH_PREVIEW_REDIRECTS !== "true") {
          return `${origin}/app`;
        }

        const variable = await previewOriginVariable(destination.origin);

        // Build-generated origin keys cannot be declared before previews exist.
        if (process.env[variable] !== destination.origin) {
          return `${origin}/app`;
        }
      }

      const path = `${destination.pathname}${destination.search}${destination.hash}`;

      return destination.origin + normalizeReturnTo(path, destination.origin);
    },
  },
});
