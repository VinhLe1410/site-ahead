import { getErrorMessage } from "../shared/errors";
import { ConvexError } from "convex/values";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireText } from "./contracts";
import { validateDocumentFile } from "../shared/documents";

// File requests authenticate with bearer tokens, not browser cookies.
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function formText(form: FormData, key: string) {
  const value = form.get(key);

  if (value === null) return "";

  if (value instanceof File) throw new ConvexError(`${key} must be text.`);

  return value;
}

export const preflight = httpAction(
  async () => new Response(null, { status: 204, headers }),
);

export const upload = httpAction(async (ctx, request) => {
  if ((await ctx.auth.getUserIdentity()) === null)
    return new Response("Sign in to upload documents.", {
      status: 401,
      headers,
    });

  try {
    const context = await ctx.runQuery(internal.documents.uploadContext, {
      documentId: new URL(request.url).searchParams.get("documentId"),
    });

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File))
      throw new ConvexError("Choose a file to upload.");
    const filename = requireText(file.name, "Filename");
    const contentType = validateDocumentFile(filename, file.type, file.size);

    const title =
      context.documentId === null
        ? requireText(formText(form, "title"), "Document title")
        : "";

    const description = formText(form, "description").trim();

    const storageId = await ctx.storage.store(
      new Blob([file], { type: contentType }),
    );

    let documentId: Id<"documents">;

    try {
      documentId = await ctx.runMutation(internal.documents.finalizeUpload, {
        ...context,
        storageId,
        filename,
        contentType,
        size: file.size,
        details: { title, description },
      });
    } catch (error) {
      // Only this request's new blob is eligible for failed-upload cleanup.
      await ctx.runMutation(internal.documents.discardUpload, { storageId });
      throw error;
    }

    return new Response(documentId, { status: 201, headers });
  } catch (error) {
    if (error instanceof ConvexError)
      return new Response(getErrorMessage(error, "Document request failed."), {
        status: 400,
        headers,
      });
    console.error("Document upload failed", error);

    return new Response("The upload failed. Please try again.", {
      status: 500,
      headers,
    });
  }
});

export const download = httpAction(async (ctx, request) => {
  if ((await ctx.auth.getUserIdentity()) === null)
    return new Response("Sign in to download documents.", {
      status: 401,
      headers,
    });

  try {
    const versionId = new URL(request.url).searchParams.get("versionId");

    if (versionId === null) throw new ConvexError("Choose a document version.");

    const version = await ctx.runQuery(internal.documents.downloadContext, {
      versionId,
    });

    const file = await ctx.storage.get(version.storageId);

    if (file === null)
      throw new ConvexError("This file is unavailable. Please try again.");

    const filename = encodeURIComponent(version.filename).replace(
      /['()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );

    return new Response(file, {
      headers: {
        ...headers,
        "Content-Type": version.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    if (error instanceof ConvexError)
      return new Response(getErrorMessage(error, "Document request failed."), {
        status: 403,
        headers,
      });
    console.error("Document download failed", error);

    return new Response("The download failed. Please try again.", {
      status: 500,
      headers,
    });
  }
});

export const downloadDraft = httpAction(async (ctx, request) => {
  if ((await ctx.auth.getUserIdentity()) === null)
    return new Response("Sign in to download drafts.", {
      status: 401,
      headers,
    });

  try {
    const itemId = new URL(request.url).searchParams.get("itemId");

    if (itemId === null) throw new ConvexError("Choose a checklist item.");

    const draft = await ctx.runQuery(
      internal.requestDocuments.downloadContext,
      { itemId },
    );

    const file = await ctx.storage.get(draft.storageId);

    if (file === null) throw new ConvexError("This draft is unavailable.");

    const filename = encodeURIComponent(draft.filename).replace(
      /['()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );

    return new Response(file, {
      headers: {
        ...headers,
        "Content-Type": draft.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    if (error instanceof ConvexError)
      return new Response(getErrorMessage(error, "Draft access denied."), {
        status: 403,
        headers,
      });

    return new Response("The draft download failed. Please try again.", {
      status: 500,
      headers,
    });
  }
});
