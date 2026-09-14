import { v, type Infer } from "convex/values";

export const PREPARATION_LIMIT = 3;

export const PREPARATION_CONTEXT_LIMIT = 40_000;

export const DISMISSAL_LIMIT = 100;

export const MESSAGE_LIMIT = 4_000;

export const PREPARATION_PROMPT_VERSION = "job-preparation-v2";

export const preparationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("done"),
  v.literal("dismissed"),
);

export const preparationSuggestionValidator = v.object({
  action: v.string(),
  rationale: v.string(),
  excerpt: v.string(),
  clientQuestion: v.union(v.string(), v.null()),
});

export const preparationEntryValidator = preparationSuggestionValidator.extend({
  id: v.string(),
  status: preparationStatusValidator,
  contextFingerprint: v.string(),
});

export type PreparationEntry = Infer<typeof preparationEntryValidator>;

export const preparationRunValidator = v.object({
  id: v.string(),
  initiatedBy: v.id("users"),
  revision: v.number(),
  contextFingerprint: v.string(),
  authoritativeFingerprint: v.string(),
  deadlineAt: v.number(),
  initialRetryAvailable: v.boolean(),
});

export const preparationMessageValidator = v.object({
  text: v.union(v.string(), v.null()),
  sourceSnapshot: v.string(),
  revision: v.number(),
  edited: v.boolean(),
});

export const jobPreparationValidator = v.object({
  jobId: v.id("jobs"),
  entries: v.array(preparationEntryValidator),
  generation: v.union(
    v.literal("running"),
    v.literal("succeeded"),
    v.literal("failed"),
  ),
  revision: v.number(),
  contextFingerprint: v.optional(v.string()),
  run: v.optional(preparationRunValidator),
  error: v.optional(v.string()),
  promptVersion: v.string(),
  dismissedContextFingerprint: v.string(),
  dismissedActions: v.array(v.string()),
  message: v.optional(preparationMessageValidator),
});

export function clientMessageSnapshot(
  entries: PreparationEntry[],
  contextFingerprint: string,
) {
  return JSON.stringify([
    contextFingerprint,
    entries.map(
      ({ id, status, clientQuestion, contextFingerprint: source }) => [
        id,
        status,
        clientQuestion,
        source,
      ],
    ),
  ]);
}

export function composeClientMessage(entries: PreparationEntry[]) {
  const questions = entries
    .filter((entry) => entry.status === "pending" && entry.clientQuestion)
    .map((entry) => entry.clientQuestion);

  return questions.length === 0
    ? null
    : `Hi, before the site visit, could you please help with the following?\n\n${questions.map((question) => `• ${question}`).join("\n\n")}\n\nThanks!`;
}
