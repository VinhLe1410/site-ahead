import { env } from "./_generated/server";
import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
