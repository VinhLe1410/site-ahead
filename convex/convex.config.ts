import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    SITE_URL: v.string(),
    JWT_PRIVATE_KEY: v.string(),
    JWKS: v.string(),
    AUTH_GOOGLE_ID: v.string(),
    AUTH_GOOGLE_SECRET: v.string(),
  },
});
