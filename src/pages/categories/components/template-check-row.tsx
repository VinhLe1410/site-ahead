import { ChevronDownIcon, FileTextIcon, PaperclipIcon } from "lucide-react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { DocumentSummary } from "../../../../convex/documentData";
import { ChecklistKindBadge } from "@/pages/jobs/components/checklist-kind-badge";
import { DocumentDownload } from "@/components/documents/document-download";

export function TemplateCheckRow({
  item,
  number,
  documents,
}: {
  item: Doc<"categories">["checklist"][number];
  number: number;
  documents: DocumentSummary[];
}) {
  const documentIds = item.documentIds ?? [];

  const heading = (
    <span className="flex min-w-0 flex-1 flex-wrap items-start gap-x-3 gap-y-2">
      <ChecklistKindBadge kind={item.kind} />
      <span className="min-w-0 flex-1 basis-48 text-sm font-medium whitespace-pre-wrap wrap-anywhere">
        {item.title.trim() || "Untitled check"}
      </span>
    </span>
  );

  return (
    <div className="flex min-w-0 flex-1 gap-4 py-4">
      <span className="w-5 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
        {number}
      </span>
      {documentIds.length === 0 ? (
        heading
      ) : (
        <details className="group min-w-0 flex-1">
          <summary className="flex cursor-pointer list-none items-start gap-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            {heading}
            <span className="flex shrink-0 items-center gap-2 pt-0.5 text-xs text-muted-foreground">
              <PaperclipIcon className="size-3.5" />
              <span>
                {documentIds.length}{" "}
                {documentIds.length === 1 ? "file" : "files"}
              </span>
              <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <ul className="space-y-2 pt-4">
            {documentIds.map((documentId) => {
              const document = documents.find(
                (entry) => entry.document._id === documentId,
              );

              return (
                <li
                  key={documentId}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] rounded-md border bg-muted/30"
                >
                  <div className="flex min-w-0 items-start gap-2 px-3 py-3 text-xs text-muted-foreground">
                    <FileTextIcon className="size-3.5 shrink-0" />
                    <span className="min-w-0 wrap-anywhere">
                      {document?.document.title ?? "Unavailable document"}
                      {document?.document.archived ? " · Archived" : ""}
                    </span>
                  </div>
                  {document !== undefined && (
                    <DocumentDownload version={document.version} attached />
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
