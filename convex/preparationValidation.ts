import { ConvexError, type Infer } from "convex/values";
import {
  PREPARATION_LIMIT,
  preparationSuggestionValidator,
} from "./preparationContracts";

export type PreparationSuggestion = Infer<
  typeof preparationSuggestionValidator
>;

export function normalizedPreparationAction(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function validatePreparationSuggestions(
  suggestions: PreparationSuggestion[],
  description: string,
  availableSlots: number,
  exclusions: string[],
) {
  if (suggestions.length > Math.min(PREPARATION_LIMIT, availableSlots))
    throw new ConvexError("Preparation returned too many items. Try again.");

  const actions = new Set(exclusions.map(normalizedPreparationAction));

  for (const suggestion of suggestions) {
    for (const [value, limit] of [
      [suggestion.action, 240],
      [suggestion.rationale, 600],
      [suggestion.excerpt, 500],
    ] as const) {
      if (!value.trim() || value.length > limit)
        throw new ConvexError("Preparation returned invalid text. Try again.");
    }

    if (!description.includes(suggestion.excerpt))
      throw new ConvexError(
        "Preparation could not be grounded in the saved description. Try again.",
      );

    if (
      suggestion.clientQuestion !== null &&
      (!suggestion.clientQuestion.trim() ||
        suggestion.clientQuestion.length > 600)
    )
      throw new ConvexError(
        "Preparation returned an invalid client question. Try again.",
      );

    const action = normalizedPreparationAction(suggestion.action);

    if (!action || actions.has(action))
      throw new ConvexError(
        "Preparation returned a duplicate action. Try again.",
      );
    actions.add(action);
  }
}
