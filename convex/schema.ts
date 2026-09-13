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
  users: defineTable({
    ...authTables.users.validator.fields,
    // Missing on legacy sessions. Only a fresh Google profile can establish trust.
    googleEmailVerified: v.optional(v.boolean()),
    normalizedEmail: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_normalizedEmail", ["normalizedEmail"]),
  organizations: defineTable({ name: v.string() }),
  memberships: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    role: v.union(v.literal("owner"), v.literal("staff")),
    state: v.union(v.literal("active"), v.literal("removed")),
  })
    .index("by_userId", ["userId"])
    .index("by_organizationId_and_state", ["organizationId", "state"])
    .index("by_organizationId_and_role_and_state", [
      "organizationId",
      "role",
      "state",
    ]),
  invitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("expired"),
      v.literal("revoked"),
      v.literal("declined"),
      v.literal("accepted"),
    ),
    expiresAt: v.number(),
    acceptedUserId: v.optional(v.id("users")),
  })
    .index("by_token", ["token"])
    .index("by_organizationId_and_status", ["organizationId", "status"])
    .index("by_email_and_status", ["email", "status"])
    .index("by_organizationId_and_email_and_status", [
      "organizationId",
      "email",
      "status",
    ]),
  tenancyRollout: defineTable({
    key: v.literal("organization-tenancy"),
    cutoff: v.number(),
    phase: v.union(
      v.literal("users"),
      v.literal("inputs"),
      v.literal("categories"),
      v.literal("jobs"),
      v.literal("validateUsers"),
      v.literal("validateOrganizations"),
      v.literal("validateInputs"),
      v.literal("validateCategories"),
      v.literal("validateJobs"),
      v.literal("validateChecklistItems"),
      v.literal("validated"),
      v.literal("ready"),
    ),
    cursor: v.union(v.string(), v.null()),
  }).index("by_key", ["key"]),
  numbers: defineTable({
    value: v.number(),
  }),
  inputs: defineTable({
    ownerId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    processedText: v.string(),
    addressText: v.union(v.string(), v.array(v.string())),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_organizationId", ["organizationId"]),
  categories: defineTable({
    ownerId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    title: v.string(),
    checklist: v.array(templateItemValidator),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_organizationId", ["organizationId"]),
  jobs: defineTable({
    ownerId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    inputId: v.id("inputs"),
    categoryId: v.optional(v.id("categories")),
    addressText: v.string(),
    status: jobStatusValidator,
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_inputId", ["inputId"])
    .index("by_categoryId", ["categoryId"]),
  checklistItems: defineTable({
    jobId: v.id("jobs"),
    title: v.string(),
    kind: checklistKindValidator,
    status: checklistItemStatusValidator,
    notes: v.string(),
  }).index("by_jobId", ["jobId"]),
});

export default schema;
