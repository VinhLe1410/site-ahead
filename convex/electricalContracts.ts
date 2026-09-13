import { v } from "convex/values";

export const electricalFindingValidator = v.object({
  kind: v.literal("electrical_classification"),
  summary: v.string(),
  coverage: v.string(),
  observedAt: v.number(),
  classification: v.union(v.literal("prescribed"), v.literal("non_prescribed")),
  rule: v.string(),
  reason: v.string(),
  matchedScope: v.string(),
  source: v.string(),
});

export const simulatedDeliveryFindingValidator = v.object({
  kind: v.literal("simulated_certificate_delivery"),
  mode: v.literal("simulation"),
  emailSent: v.literal(false),
  summary: v.string(),
  coverage: v.string(),
  observedAt: v.number(),
  certificateId: v.id("electricalCertificates"),
  filename: v.string(),
  recipient: v.string(),
  confirmationKey: v.string(),
});

export const electricalRequestDraftValidator = v.object({
  skillKey: v.union(v.literal("lei-booking"), v.literal("coes-portal")),
  title: v.string(),
  destinationUrl: v.string(),
  guidanceUrl: v.string(),
  guidance: v.string(),
  savedAt: v.number(),
  fields: v.array(
    v.object({
      field: v.string(),
      label: v.string(),
      value: v.union(v.string(), v.null()),
      source: v.string(),
      portalLabelVerified: v.boolean(),
    }),
  ),
  subject: v.optional(v.string()),
  body: v.optional(v.string()),
});

export const electricalCertificateValidator = v.object({
  itemId: v.id("checklistItems"),
  jobId: v.id("jobs"),
  organizationId: v.id("organizations"),
  storageId: v.id("_storage"),
  filename: v.string(),
  size: v.number(),
  sha256: v.string(),
  uploadedBy: v.id("users"),
  uploadedAt: v.number(),
  snapshot: v.string(),
  recipient: v.optional(v.string()),
  confirmedBy: v.optional(v.id("users")),
  confirmedAt: v.optional(v.number()),
  confirmationKey: v.optional(v.string()),
  simulatedAt: v.optional(v.number()),
});
