import { ConvexError, v, type Infer } from "convex/values";
import { schema } from "./schema";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  requireOrganizationDocument,
  requireOrganizationDocumentVersion,
} from "./access";
import { validateTemplate } from "./contracts";

export const documentSummaryValidator = v.object({
  document: schema.doc("documents"),
  version: schema.doc("documentVersions").omit("storageId"),
});

export type DocumentSummary = Infer<typeof documentSummaryValidator>;

export function summarizeDocument(
  document: Doc<"documents">,
  version: Doc<"documentVersions">,
): DocumentSummary {
  const { storageId: _storageId, ...metadata } = version;

  return { document, version: metadata };
}

export async function currentDocumentVersion(
  db: QueryCtx["db"],
  document: Doc<"documents">,
) {
  const version = await db
    .query("documentVersions")
    .withIndex("by_documentId_and_number", (q) =>
      q.eq("documentId", document._id).eq("number", document.currentVersion),
    )
    .unique();

  if (version === null) throw new Error("Document current version is missing");

  return version;
}

export async function templateDocumentVersions(
  db: QueryCtx["db"],
  organizationId: Id<"organizations">,
  checklist: Doc<"categories">["checklist"],
) {
  const items = validateTemplate(checklist);
  const versions = new Map<Id<"documents">, Doc<"documentVersions">>();

  for (const item of items) {
    for (const documentId of item.documentIds) {
      if (versions.has(documentId)) continue;
      const document = await db.get("documents", documentId);

      if (document === null || document.organizationId !== organizationId)
        throw new ConvexError(
          `A document for "${item.title}" is unavailable. Remove or replace it in the category template.`,
        );

      if (document.archived)
        throw new ConvexError(
          `"${document.title}" on "${item.title}" is archived. Remove or replace it in the category template.`,
        );
      versions.set(documentId, await currentDocumentVersion(db, document));
    }
  }

  return items.map((item) => ({
    ...item,
    documentVersionIds: item.documentIds.map((id) => {
      const version = versions.get(id);

      if (version === undefined)
        throw new Error("Document version was not resolved");

      return version._id;
    }),
  }));
}

export async function templateDocuments(
  db: QueryCtx["db"],
  organizationId: Id<"organizations">,
  checklist: Doc<"categories">["checklist"],
) {
  const ids = new Set(checklist.flatMap((item) => item.documentIds ?? []));

  return await Promise.all(
    Array.from(ids, async (id) => {
      const document = await requireOrganizationDocument(
        db,
        id,
        organizationId,
      );

      const version = await currentDocumentVersion(db, document);

      return summarizeDocument(document, version);
    }),
  );
}

export async function checklistDocuments(
  db: QueryCtx["db"],
  organizationId: Id<"organizations">,
  checklist: Doc<"checklistItems">[],
) {
  const ids = new Set(
    checklist.flatMap((item) => item.documentVersionIds ?? []),
  );

  return await Promise.all(
    Array.from(ids, async (id) => {
      const { document, version } = await requireOrganizationDocumentVersion(
        db,
        id,
        organizationId,
      );

      return summarizeDocument(document, version);
    }),
  );
}
