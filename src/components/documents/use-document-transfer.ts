import { useAuthToken } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { validateDocumentFile } from "../../../shared/documents";

export function useDocumentTransfer() {
  const token = useAuthToken();
  const convex = useConvex();

  async function transfer(path: string, options: RequestInit) {
    if (token === null) throw new Error("Sign in to access documents.");
    const origin = await convex.query(api.documents.transferOrigin);

    const response = await fetch(new URL(path, origin), {
      ...options,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error(await response.text());

    return response;
  }

  async function upload(
    file: File,
    title: string,
    description: string,
    documentId: Id<"documents"> | null,
  ) {
    validateDocumentFile(file.name, file.type, file.size);
    const form = new FormData();

    form.set("file", file);
    form.set("title", title);
    form.set("description", description);
    const parameters = new URLSearchParams();

    if (documentId !== null) parameters.set("documentId", documentId);

    const response = await transfer(`/documents/upload?${parameters}`, {
      method: "POST",
      body: form,
    });

    return await response.text();
  }

  async function download(versionId: Id<"documentVersions">, filename: string) {
    const parameters = new URLSearchParams({ versionId });

    const response = await transfer(`/documents/download?${parameters}`, {
      method: "GET",
    });

    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return { upload, download };
}
