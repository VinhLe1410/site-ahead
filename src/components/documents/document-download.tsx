import { getErrorMessage } from "../../../shared/errors";
import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import type { DocumentSummary } from "../../../convex/documentData";
import { useDocumentTransfer } from "./use-document-transfer";
import { Button } from "@/components/ui/button";
import { RequestError } from "@/components/layout/request-error";

export function DocumentDownload({
  version,
  attached = false,
}: Pick<DocumentSummary, "version"> & { attached?: boolean }) {
  const { download } = useDocumentTransfer();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startDownload() {
    setPending(true);
    setError(null);

    try {
      await download(version._id, version.filename);
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not download the file. Try again."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={attached ? "contents" : "space-y-2"}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={
          attached
            ? "h-auto min-h-10 self-stretch rounded-none rounded-r-md border-0 border-l bg-transparent shadow-none focus-visible:ring-inset"
            : undefined
        }
        disabled={pending}
        onClick={() => void startDownload()}
        aria-label={`Download ${version.filename}, version ${version.number}`}
      >
        <DownloadIcon />
        {pending ? "Downloading..." : "Download"}
      </Button>
      {error !== null && (
        <div
          className={attached ? "col-span-full border-t px-3 py-2" : undefined}
        >
          <RequestError message={error} />
        </div>
      )}
    </div>
  );
}
