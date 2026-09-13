import { ConvexError, v, type Infer } from "convex/values";
import { MAX_ITEM_DOCUMENTS } from "../shared/documents";

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
  documentIds: v.optional(v.array(v.id("documents"))),
});

export const documentFileValidator = v.object({
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
});

export const documentDetailsValidator = v.object({
  title: v.string(),
  description: v.string(),
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

export const jobInputValidator = v.object({
  processedText: v.string(),
  addressText: v.string(),
  categoryId: v.union(v.id("categories"), v.null()),
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
    throw new ConvexError(`${field} is required`);
  }

  return text;
}

export function validateTemplate(
  checklist: Array<Infer<typeof templateItemValidator>>,
) {
  if (checklist.length > MAX_TEMPLATE_ITEMS) {
    throw new ConvexError(
      `Checklist templates can contain at most ${MAX_TEMPLATE_ITEMS} items`,
    );
  }

  return checklist.map((item, index) => {
    const documentIds = item.documentIds ?? [];

    if (documentIds.length > MAX_ITEM_DOCUMENTS)
      throw new ConvexError(
        `Item ${index + 1} can have at most ${MAX_ITEM_DOCUMENTS} documents.`,
      );

    if (new Set(documentIds).size !== documentIds.length)
      throw new ConvexError(
        `Item ${index + 1} has duplicate document references.`,
      );

    return {
      ...item,
      title: requireText(item.title, `Checklist item ${index + 1} title`),
      documentIds,
    };
  });
}
