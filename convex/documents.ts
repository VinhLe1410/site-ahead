import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  env,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  activeMembership,
  requireMembership,
  requireOrganizationDocument,
  requireOrganizationDocumentVersion,
} from "./access";
import {
  documentDetailsValidator,
  documentFileValidator,
  requireText,
} from "./contracts";
import {
  currentDocumentVersion,
  documentSummaryValidator,
  summarizeDocument,
} from "./documentData";
import { schema } from "./schema";
import { validateDocumentFile } from "../shared/documents";

export const list = query({
  args: { search: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(documentSummaryValidator),
  handler: async (ctx, args) => {
    const membership = await activeMembership(ctx);

    if (membership === null)
      return { page: [], isDone: true, continueCursor: "" };
    const search = args.search.trim();
    const { organizationId } = membership;

    const result =
      search.length === 0
        ? await ctx.db
            .query("documents")
            .withIndex("by_organizationId_and_archived", (q) =>
              q.eq("organizationId", organizationId).eq("archived", false),
            )
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("documents")
            .withSearchIndex("search_text", (q) =>
              q
                .search("searchText", search)
                .eq("organizationId", organizationId)
                .eq("archived", false),
            )
            .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (document) =>
        summarizeDocument(
          document,
          await currentDocumentVersion(ctx.db, document),
        ),
      ),
    );

    return { ...result, page };
  },
});

export const get = query({
  args: { documentId: v.string() },
  returns: v.union(
    documentSummaryValidator.extend({
      uploader: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const membership = await activeMembership(ctx);

    if (membership === null) return null;
    const id = ctx.db.normalizeId("documents", args.documentId);

    if (id === null) return null;
    const document = await ctx.db.get("documents", id);

    if (
      document === null ||
      document.organizationId !== membership.organizationId
    )
      return null;
    const version = await currentDocumentVersion(ctx.db, document);
    const uploader = await ctx.db.get("users", version.uploadedBy);

    if (uploader === null) throw new Error("Document uploader is missing");

    return {
      ...summarizeDocument(document, version),
      uploader: uploader.name ?? uploader.email ?? null,
    };
  },
});

export const transferOrigin = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireMembership(ctx);

    return env.CONVEX_SITE_URL;
  },
});

export const update = mutation({
  args: { documentId: v.id("documents"), ...documentDetailsValidator.fields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);

    const document = await requireOrganizationDocument(
      ctx.db,
      args.documentId,
      organizationId,
    );

    if (document.archived)
      throw new ConvexError("Archived documents cannot be edited.");
    const title = requireText(args.title, "Document title");
    const description = args.description.trim();

    await ctx.db.patch("documents", document._id, {
      title,
      description,
      searchText: `${title}\n${description}`,
    });

    return null;
  },
});

export const archive = mutation({
  args: { documentId: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);
    await requireOrganizationDocument(ctx.db, args.documentId, organizationId);
    await ctx.db.patch("documents", args.documentId, { archived: true });

    return null;
  },
});

export const uploadContext = internalQuery({
  args: { documentId: v.union(v.string(), v.null()) },
  returns: v.object({
    organizationId: v.id("organizations"),
    documentId: v.union(v.id("documents"), v.null()),
  }),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);

    if (args.documentId === null) return { organizationId, documentId: null };
    const documentId = ctx.db.normalizeId("documents", args.documentId);

    if (documentId === null) throw new ConvexError("Document not found");

    const document = await requireOrganizationDocument(
      ctx.db,
      documentId,
      organizationId,
    );

    if (document.archived)
      throw new ConvexError("Archived documents cannot be replaced.");

    return { organizationId, documentId };
  },
});

export const finalizeUpload = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    documentId: v.union(v.id("documents"), v.null()),
    storageId: v.id("_storage"),
    details: documentDetailsValidator,
    ...documentFileValidator.fields,
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx);

    if (membership.organizationId !== args.organizationId)
      throw new ConvexError(
        "Organization access changed during upload. Try again.",
      );
    const metadata = await ctx.db.system.get("_storage", args.storageId);

    if (metadata === null || metadata.size !== args.size)
      throw new ConvexError(
        "The uploaded file could not be verified. Try again.",
      );

    const contentType = validateDocumentFile(
      args.filename,
      args.contentType,
      metadata.size,
    );

    let documentId = args.documentId;
    let number = 1;

    if (documentId === null) {
      const title = requireText(args.details.title, "Document title");
      const description = args.details.description.trim();

      documentId = await ctx.db.insert("documents", {
        organizationId: membership.organizationId,
        title,
        description,
        searchText: `${title}\n${description}`,
        archived: false,
        currentVersion: number,
      });
    } else {
      const document = await requireOrganizationDocument(
        ctx.db,
        documentId,
        membership.organizationId,
      );

      if (document.archived)
        throw new ConvexError("The document was archived during upload.");
      number = document.currentVersion + 1;
      await ctx.db.patch("documents", documentId, { currentVersion: number });
    }

    await ctx.db.insert("documentVersions", {
      documentId,
      number,
      storageId: args.storageId,
      filename: args.filename,
      contentType,
      size: metadata.size,
      uploadedBy: membership.userId,
    });

    return documentId;
  },
});

export const downloadContext = internalQuery({
  args: { versionId: v.string() },
  returns: schema.doc("documentVersions"),
  handler: async (ctx, args) => {
    const { organizationId } = await requireMembership(ctx);
    const versionId = ctx.db.normalizeId("documentVersions", args.versionId);

    if (versionId === null) throw new ConvexError("Document version not found");

    const { version } = await requireOrganizationDocumentVersion(
      ctx.db,
      versionId,
      organizationId,
    );

    return version;
  },
});

export const discardUpload = internalMutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const version = await ctx.db
      .query("documentVersions")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();

    // A lost finalization response must not delete an already committed file.
    if (version === null) await ctx.storage.delete(args.storageId);

    return null;
  },
});
