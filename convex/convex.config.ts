import agent from "@convex-dev/agent/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    SITE_URL: v.string(),
    JWT_PRIVATE_KEY: v.string(),
    JWKS: v.string(),
    AUTH_GOOGLE_ID: v.string(),
    AUTH_GOOGLE_SECRET: v.string(),
    AUTH_PREVIEW_REDIRECTS: v.optional(v.literal("true")),
    LANGFUSE_BASE_URL: v.string(),
    LANGFUSE_PUBLIC_KEY: v.string(),
    LANGFUSE_SECRET_KEY: v.string(),
    OPENAI_API_KEY: v.optional(v.string()),
  },
});

app.use(agent);

export default app;
