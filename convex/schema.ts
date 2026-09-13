import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import {
  checklistItemStatusValidator,
  checklistKindValidator,
  jobStatusValidator,
  templateItemValidator,
} from "./contracts";

export const schema = defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),
  inputs: defineTable({
    ownerId: v.id("users"),
    processedText: v.string(),
    addressText: v.union(v.string(), v.array(v.string())),
  }).index("by_ownerId", ["ownerId"]),
  categories: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    checklist: v.array(templateItemValidator),
  }).index("by_ownerId", ["ownerId"]),
  jobs: defineTable({
    ownerId: v.id("users"),
    inputId: v.id("inputs"),
    categoryId: v.optional(v.id("categories")),
    addressText: v.string(),
    status: jobStatusValidator,
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_inputId", ["inputId"]),
  checklistItems: defineTable({
    jobId: v.id("jobs"),
    title: v.string(),
    kind: checklistKindValidator,
    status: checklistItemStatusValidator,
    notes: v.string(),
  }).index("by_jobId", ["jobId"]),
});

export default schema;
