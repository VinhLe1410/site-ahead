"use node";

import { PDFDocument } from "pdf-lib";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type CertificateDownload = { filename: string; bytes: ArrayBuffer };

export const upload = action({
  args: {
    itemId: v.id("checklistItems"),
    filename: v.string(),
    bytes: v.bytes(),
  },
  returns: v.id("electricalCertificates"),
  handler: async (ctx, args): Promise<Id<"electricalCertificates">> => {
    const context = await ctx.runQuery(
      internal.electricalDelivery.uploadContext,
      { itemId: args.itemId },
    );

    if (
      !args.filename.toLowerCase().endsWith(".pdf") ||
      args.filename.length > 200 ||
      /[\r\n/\\]/.test(args.filename) ||
      args.bytes.byteLength === 0 ||
      args.bytes.byteLength > 2_000_000
    )
      throw new ConvexError("Choose a PDF up to 2 MB with a valid filename.");

    try {
      if (new TextDecoder().decode(args.bytes.slice(0, 5)) !== "%PDF-")
        throw new Error("not_pdf");
      const pdf = await PDFDocument.load(args.bytes);

      if (pdf.getPageCount() < 1) throw new Error("empty_pdf");
    } catch {
      throw new ConvexError(
        "The file is not a readable, unencrypted PDF. Upload the actual completed COES PDF.",
      );
    }

    const storageId = await ctx.storage.store(
      new Blob([args.bytes], { type: "application/pdf" }),
    );

    try {
      return await ctx.runMutation(internal.electricalDelivery.registerUpload, {
        itemId: args.itemId,
        filename: args.filename,
        storageId,
        ...context,
      });
    } catch (cause) {
      await ctx.storage.delete(storageId);
      throw cause;
    }
  },
});

export const download = action({
  args: { itemId: v.id("checklistItems") },
  returns: v.object({ filename: v.string(), bytes: v.bytes() }),
  handler: async (ctx, args): Promise<CertificateDownload> => {
    const certificate = await ctx.runQuery(
      internal.electricalDelivery.downloadContext,
      args,
    );

    const file = await ctx.storage.get(certificate.storageId);

    if (!file)
      throw new ConvexError("The uploaded certificate is unavailable.");

    return { filename: certificate.filename, bytes: await file.arrayBuffer() };
  },
});
