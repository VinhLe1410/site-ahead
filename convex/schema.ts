import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import {
  checklistItemStatusValidator,
  checklistKindValidator,
  jobStatusValidator,
  templateItemValidator,
  documentDetailsValidator,
  documentFileValidator,
  jobInputValidator,
} from "./contracts";

import {
  checklistAgentStateValidator,
  confirmedYearValidator,
  formKeyValidator,
  jobAgentContextValidator,
} from "./agentContracts";

export const schema = defineSchema({
  ...authTables,
  users: defineTable({
    ...authTables.users.validator.fields,
    // Invitation access requires Google's explicit verified email claim.
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
  numbers: defineTable({
    value: v.number(),
  }),
  documents: defineTable({
    organizationId: v.id("organizations"),
    ...documentDetailsValidator.fields,
    searchText: v.string(),
    archived: v.boolean(),
    currentVersion: v.number(),
  })
    .index("by_organizationId_and_archived", ["organizationId", "archived"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["organizationId", "archived"],
    }),
  documentVersions: defineTable({
    documentId: v.id("documents"),
    number: v.number(),
    storageId: v.id("_storage"),
    ...documentFileValidator.fields,
    uploadedBy: v.id("users"),
    formKey: v.optional(formKeyValidator),
  })
    .index("by_documentId_and_number", ["documentId", "number"])
    .index("by_storageId", ["storageId"]),
  inputs: defineTable({
    organizationId: v.id("organizations"),
    processedText: v.string(),
    addressText: v.union(v.string(), v.array(v.string())),
  }).index("by_organizationId", ["organizationId"]),
  categories: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    checklist: v.array(templateItemValidator),
  }).index("by_organizationId", ["organizationId"]),
  jobDrafts: defineTable({
    ...jobInputValidator.fields,
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    threadId: v.string(),
    status: v.union(v.literal("draft"), v.literal("submitted")),
    revision: v.number(),
    jobId: v.optional(v.id("jobs")),
    runId: v.optional(v.string()),
    promptMessageId: v.optional(v.string()),
    deadlineAt: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_userId_and_organizationId_and_status", [
    "userId",
    "organizationId",
    "status",
  ]),
  jobs: defineTable({
    organizationId: v.id("organizations"),
    inputId: v.id("inputs"),
    categoryId: v.optional(v.id("categories")),
    addressText: v.string(),
    status: jobStatusValidator,
    confirmedConstructionYear: v.optional(confirmedYearValidator),
    agentContext: v.optional(jobAgentContextValidator),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_inputId", ["inputId"])
    .index("by_categoryId", ["categoryId"]),
  checklistAgentStates: defineTable(checklistAgentStateValidator)
    .index("by_itemId", ["itemId"])
    .index("by_jobId", ["jobId"]),
  checklistItems: defineTable({
    jobId: v.id("jobs"),
    title: v.string(),
    kind: checklistKindValidator,
    status: checklistItemStatusValidator,
    notes: v.string(),
    documentVersionIds: v.optional(v.array(v.id("documentVersions"))),
  }).index("by_jobId", ["jobId"]),
});

export default schema;
