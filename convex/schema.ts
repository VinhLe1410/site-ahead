import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const schema = defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),
});

export default schema;
