export type ChecklistItemId = string | number;

export type ChecklistKind = "automated" | "third_party" | "on_site";

export type ChecklistInputItem = {
  id: ChecklistItemId;
  item: string;
};

export type ModelClassification = {
  id: ChecklistItemId;
  category?: string;
};

export type NormalizedClassification = {
  id: ChecklistItemId;
  category: ChecklistKind;
};

export type ClassificationFallback = {
  id: ChecklistItemId;
  reason: string;
};

export type NormalizedClassifications = {
  classifications: NormalizedClassification[];
  fallbacks: ClassificationFallback[];
  unknownModelItemIds: ChecklistItemId[];
};

function normalizeCategory(
  category: string | undefined,
): ChecklistKind | undefined {
  switch (category) {
    case "automated":
      return "automated";
    case "third_party":
      return "third_party";
    case "on_site":
      return "on_site";
    default:
      return undefined;
  }
}

function itemIdKey(id: ChecklistItemId): string {
  return String(id);
}

export function normalizeItemClassifications(
  items: ChecklistInputItem[],
  modelClassifications: ModelClassification[],
  modelFailureReason?: string,
): NormalizedClassifications {
  const classificationsById = new Map<string, ModelClassification>();
  const duplicateModelIds = new Set<string>();
  const inputItemIds = new Set(items.map((item) => itemIdKey(item.id)));
  const unknownModelItemIds: ChecklistItemId[] = [];

  for (const classification of modelClassifications) {
    const key = itemIdKey(classification.id);

    if (!inputItemIds.has(key)) {
      unknownModelItemIds.push(classification.id);
      continue;
    }

    if (classificationsById.has(key)) {
      duplicateModelIds.add(key);
      continue;
    }

    classificationsById.set(key, classification);
  }

  const fallbacks: ClassificationFallback[] = [];

  const classifications = items.map((item): NormalizedClassification => {
    const key = itemIdKey(item.id);
    const modelClassification = classificationsById.get(key);

    if (modelFailureReason) {
      fallbacks.push({ id: item.id, reason: modelFailureReason });

      return { id: item.id, category: "on_site" };
    }

    if (duplicateModelIds.has(key)) {
      fallbacks.push({
        id: item.id,
        reason: "duplicate_model_classification",
      });

      return { id: item.id, category: "on_site" };
    }

    const category = normalizeCategory(modelClassification?.category);

    if (!category) {
      fallbacks.push({
        id: item.id,
        reason: modelClassification
          ? modelClassification.category === undefined
            ? "missing_model_category"
            : "invalid_model_category"
          : "missing_model_classification",
      });

      return { id: item.id, category: "on_site" };
    }

    return { id: item.id, category };
  });

  return { classifications, fallbacks, unknownModelItemIds };
}
