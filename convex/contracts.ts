import { v } from "convex/values";

export const checklistKindValidator = v.union(
  v.literal("automated"),
  v.literal("third_party"),
  v.literal("on_site"),
);

export const jobStatusValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("done"),
);

export const checklistItemStatusValidator = v.union(
  v.literal("pending"),
  v.literal("done"),
);

export const templateItemValidator = v.object({
  title: v.string(),
  kind: checklistKindValidator,
});

export const intakeJobTypeValidator = v.union(
  v.literal("excavation_and_trenching"),
  v.literal("electrical_work"),
  v.literal("other"),
);

export const intakeResultValidator = v.object({
  jobType: intakeJobTypeValidator,
  location: v.string(),
  description: v.string(),
});

export const transcriptionResultValidator = v.object({
  text: v.string(),
  languageCode: v.optional(v.string()),
});

export const audioIntakeResultValidator = v.object({
  transcript: v.string(),
  extraction: intakeResultValidator,
});

export const MAX_TEMPLATE_ITEMS = 100;

export function requireText(value: string, field: string): string {
  const text = value.trim();

  if (text.length === 0) {
    throw new Error(`${field} is required`);
  }

  return text;
}

export function validateTemplate(
  checklist: Array<{
    title: string;
    kind: "automated" | "third_party" | "on_site";
  }>,
) {
  if (checklist.length > MAX_TEMPLATE_ITEMS) {
    throw new Error(
      `Checklist templates can contain at most ${MAX_TEMPLATE_ITEMS} items`,
    );
  }

  return checklist.map((item, index) => ({
    ...item,
    title: requireText(item.title, `Checklist item ${index + 1} title`),
  }));
}
