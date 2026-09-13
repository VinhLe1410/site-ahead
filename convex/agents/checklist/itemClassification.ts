export type ChecklistItemId = string | number;

export type ChecklistKind = "automated" | "third_party" | "on_site";

export type ChecklistInputItem = { id: ChecklistItemId; item: string };

export type ModelClassification = { id: ChecklistItemId; category?: string };

export type NormalizedClassification = {
  id: ChecklistItemId;
  category: ChecklistKind;
};

export type ClassificationFailure = { id: ChecklistItemId; reason: string };

export type NormalizedClassifications = {
  classifications: NormalizedClassification[];
  failures: ClassificationFailure[];
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

export function normalizeItemClassifications(
  items: ChecklistInputItem[],
  modelClassifications: ModelClassification[],
  modelFailureReason?: string,
): NormalizedClassifications {
  const classificationsById = new Map<string, ModelClassification>();
  const duplicateModelIds = new Set<string>();
  const inputItemIds = new Set(items.map((item) => String(item.id)));
  const unknownModelItemIds: ChecklistItemId[] = [];

  for (const classification of modelClassifications) {
    const key = String(classification.id);

    if (!inputItemIds.has(key)) {
      unknownModelItemIds.push(classification.id);
      continue;
    }

    if (classificationsById.has(key)) duplicateModelIds.add(key);
    else classificationsById.set(key, classification);
  }

  const failures: ClassificationFailure[] = [];
  const classifications: NormalizedClassification[] = [];

  for (const item of items) {
    const key = String(item.id);
    const modelClassification = classificationsById.get(key);
    const category = normalizeCategory(modelClassification?.category);

    const reason =
      modelFailureReason ??
      (duplicateModelIds.has(key)
        ? "duplicate_model_classification"
        : modelClassification === undefined
          ? "missing_model_classification"
          : modelClassification.category === undefined
            ? "missing_model_category"
            : category === undefined
              ? "invalid_model_category"
              : undefined);

    if (reason !== undefined) failures.push({ id: item.id, reason });
    else if (category !== undefined)
      classifications.push({ id: item.id, category });
  }

  return { classifications, failures, unknownModelItemIds };
}

export async function persistClassificationOutcome(
  persist: (category?: ChecklistKind, failure?: string) => Promise<boolean>,
  category?: ChecklistKind,
  failure?: string,
): Promise<{ saved: boolean; persistenceFailed: boolean }> {
  try {
    return {
      saved: await persist(category, failure),
      persistenceFailed: false,
    };
  } catch {
    try {
      await persist(undefined, "classification_save_failed");
    } catch {
      // The independent deadline records failure once storage is available again.
    }

    return { saved: false, persistenceFailed: true };
  }
}
