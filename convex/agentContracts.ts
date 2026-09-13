import { ConvexError, v } from "convex/values";
import { agentFindingValidator } from "./evidenceContracts";

export const formKeyValidator = v.union(
  v.literal("building-permit-request"),
  v.literal("occupancy-inspection-request"),
  v.literal("certificate-consent-request"),
);

export const confirmedYearValidator = v.object({
  year: v.number(),
  suppliedBy: v.id("users"),
  suppliedAt: v.number(),
});

export const jobAgentFieldsValidator = v.object({
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  roadName: v.optional(v.string()),
  locality: v.optional(v.string()),
  contractorName: v.optional(v.string()),
  contractorEmail: v.optional(v.string()),
  contractorPhone: v.optional(v.string()),
  contractorLicence: v.optional(v.string()),
  clientName: v.optional(v.string()),
  plannedStartDate: v.optional(v.string()),
});

export const jobAgentContextValidator = jobAgentFieldsValidator.extend({
  suppliedBy: v.id("users"),
  suppliedAt: v.number(),
});

export const agentExecutionValidator = v.union(
  v.literal("idle"),
  v.literal("running"),
  v.literal("waiting"),
  v.literal("finished"),
  v.literal("failed"),
);

export const agentProvenanceValidator = v.object({
  source: v.string(),
  method: v.union(
    v.literal("live_api"),
    v.literal("manual"),
    v.literal("database"),
  ),
  observedAt: v.number(),
  reference: v.optional(v.string()),
  suppliedBy: v.optional(v.id("users")),
});

export const missingFieldValidator = v.object({
  field: v.string(),
  label: v.string(),
  reason: v.string(),
});

export const agentDraftValidator = v.object({
  storageId: v.id("_storage"),
  sourceVersionId: v.id("documentVersions"),
  formKey: formKeyValidator,
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
  savedAt: v.number(),
});

export const agentClassificationValidator = v.object({
  dispatchPending: v.optional(v.boolean()),
  snapshot: v.optional(v.string()),
  initiatedBy: v.optional(v.id("users")),
  status: v.union(
    v.literal("idle"),
    v.literal("running"),
    v.literal("succeeded"),
    v.literal("failed"),
  ),
  runId: v.optional(v.string()),
  traceId: v.optional(v.string()),
  spanId: v.optional(v.string()),
  error: v.optional(v.string()),
});

export const checklistAgentStateValidator = v.object({
  itemId: v.id("checklistItems"),
  jobId: v.id("jobs"),
  classification: agentClassificationValidator,
  execution: agentExecutionValidator,
  queued: v.optional(v.boolean()),
  queuedAt: v.optional(v.number()),
  queueAttempt: v.optional(v.number()),
  attempt: v.optional(v.number()),
  threadId: v.optional(v.string()),
  runId: v.optional(v.string()),
  traceId: v.optional(v.string()),
  initiatedBy: v.optional(v.id("users")),
  currentStep: v.string(),
  error: v.optional(v.string()),
  snapshot: v.optional(v.string()),
  startedAt: v.optional(v.number()),
  deadlineAt: v.optional(v.number()),
  updatedAt: v.number(),
  finding: v.optional(agentFindingValidator),
  draft: v.optional(agentDraftValidator),
  provenance: v.array(agentProvenanceValidator),
  missingInformation: v.array(missingFieldValidator),
  nextAction: v.string(),
});

export function validateConstructionYear(year: number, now: number): number {
  if (
    !Number.isInteger(year) ||
    year < 1800 ||
    year > new Date(now).getUTCFullYear()
  )
    throw new ConvexError(
      "Construction year must be an integer from 1800 through the current UTC year.",
    );

  return year;
}
