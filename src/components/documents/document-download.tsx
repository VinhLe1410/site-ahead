import { getErrorMessage } from "../../../shared/errors";
import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import type { DocumentSummary } from "../../../convex/documentData";
import { useDocumentTransfer } from "./use-document-transfer";
import { Button } from "@/components/ui/button";
import { RequestError } from "@/components/layout/request-error";

export function DocumentDownload({
  version,
}: Pick<DocumentSummary, "version">) {
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
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => void startDownload()}
        aria-label={`Download ${version.filename}, version ${version.number}`}
      >
        <DownloadIcon />
        {pending ? "Downloading..." : "Download"}
      </Button>
      {error !== null && <RequestError message={error} />}
    </div>
  );
}
