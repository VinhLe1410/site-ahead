import type { Doc } from "../convex/_generated/dataModel";
import type { ItemContext } from "../convex/jobAgentContext";
import { isCertificateDelivery } from "./electrical";

export type SnapshotContext = Pick<
  ItemContext,
  "item" | "job" | "input" | "certificate"
> & {
  category: Pick<NonNullable<ItemContext["category"]>, "title"> | null;
};

export function itemSnapshot(item: Doc<"checklistItems">) {
  return JSON.stringify([
    item._id,
    item._creationTime,
    item.jobId,
    item.title,
    item.kind,
    item.status,
    item.notes,
    item.documentVersionIds ?? [],
  ]);
}

export function classificationSnapshot(context: SnapshotContext) {
  return JSON.stringify({
    item: itemSnapshot(context.item),
    organizationId: context.job.organizationId,
    inputId: context.job.inputId,
    address: context.job.addressText,
    text: context.input.processedText,
    categoryId: context.job.categoryId,
    categoryTitle: context.category?.title,
  });
}

export function executionSnapshot(context: SnapshotContext) {
  const fields = context.job.agentContext;
  const title = context.item.title.toLowerCase();

  const relevant = isCertificateDelivery(context.item.title)
    ? [
        fields,
        context.certificate?.storageId,
        context.certificate?.recipient,
        context.certificate?.confirmationKey,
        context.certificate?.confirmedAt,
      ]
    : context.item.kind === "third_party"
      ? fields
      : title.includes("construction year")
        ? context.job.confirmedConstructionYear
        : title.includes("air quality")
          ? [fields?.latitude, fields?.longitude]
          : title.includes("road closure")
            ? [fields?.roadName, fields?.locality]
            : undefined;

  return JSON.stringify([classificationSnapshot(context), relevant]);
}
