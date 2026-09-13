import { useId, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { FilePlusIcon, XIcon } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { DocumentSummary } from "../../../../convex/documentData";
import { MAX_ITEM_DOCUMENTS } from "../../../../shared/documents";
import { DocumentDownload } from "@/components/documents/document-download";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function DocumentChoices({
  selectedIds,
  onSelect,
}: {
  selectedIds: Id<"documents">[];
  onSelect: (document: DocumentSummary) => void;
}) {
  const [search, setSearch] = useState("");
  const id = useId();

  const documents = usePaginatedQuery(
    api.documents.list,
    { search },
    { initialNumItems: 20 },
  );

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor={id}>Search titles and descriptions</FieldLabel>
        <Input
          id={id}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Field>
      {documents.status === "LoadingFirstPage" && (
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      )}
      {documents.status !== "LoadingFirstPage" &&
        documents.results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No documents found. Upload documents in Library or change your
            search.
          </p>
        )}
      <ul className="max-h-72 space-y-2 overflow-auto">
        {documents.results.map((reference) => {
          const selected = selectedIds.includes(reference.document._id);

          return (
            <li
              key={reference.document._id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">
                  {reference.document.title}
                </p>
                <p className="break-words text-xs text-muted-foreground">
                  {reference.version.filename} · Version{" "}
                  {reference.version.number}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={selected || selectedIds.length >= MAX_ITEM_DOCUMENTS}
                onClick={() => onSelect(reference)}
                aria-label={`Add ${reference.document.title}`}
              >
                {selected ? "Added" : "Add"}
              </Button>
            </li>
          );
        })}
      </ul>
      {documents.status === "CanLoadMore" && (
        <Button
          type="button"
          variant="outline"
          onClick={() => documents.loadMore(20)}
        >
          Load more documents
        </Button>
      )}
      {documents.status === "LoadingMore" && (
        <p className="text-sm text-muted-foreground">
          Loading more documents...
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {selectedIds.length} of {MAX_ITEM_DOCUMENTS} documents selected.
      </p>
    </div>
  );
}

export function DocumentPicker({
  selectedIds,
  savedDocuments,
  onChange,
  onDocumentAdded,
  disabled,
}: {
  selectedIds: Id<"documents">[];
  savedDocuments: DocumentSummary[];
  onChange: (ids: Id<"documents">[]) => void;
  onDocumentAdded?: (document: DocumentSummary) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [addedDocuments, setAddedDocuments] = useState<DocumentSummary[]>([]);

  const known = new Map(
    [...addedDocuments, ...savedDocuments].map((reference) => [
      reference.document._id,
      reference,
    ]),
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Documents</p>
      {selectedIds.length > 0 && (
        <ul className="space-y-2">
          {selectedIds.map((documentId) => {
            const reference = known.get(documentId);

            return (
              <li
                key={documentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">
                    {reference?.document.title ?? "Unavailable document"}
                  </p>
                  {reference?.document.archived && (
                    <Badge variant="destructive">
                      Archived, remove or replace
                    </Badge>
                  )}
                  {reference !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {reference.version.filename} · Version{" "}
                      {reference.version.number}
                    </p>
                  )}
                </div>
                {reference !== undefined && (
                  <DocumentDownload version={reference.version} />
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={disabled}
                  aria-label={`Remove ${reference?.document.title ?? "unavailable document"}`}
                  onClick={() =>
                    onChange(selectedIds.filter((id) => id !== documentId))
                  }
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Attach documents"
              disabled={disabled || selectedIds.length >= MAX_ITEM_DOCUMENTS}
            />
          }
        >
          <FilePlusIcon />
          Attach documents
        </DialogTrigger>
        <DialogContent className="z-60 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Attach documents</DialogTitle>
            <DialogDescription>
              New jobs receive the current version of each selected document.
            </DialogDescription>
          </DialogHeader>
          {open && (
            <DocumentChoices
              selectedIds={selectedIds}
              onSelect={(reference) => {
                onDocumentAdded?.(reference);
                setAddedDocuments((current) => [
                  ...current.filter((entry) =>
                    selectedIds.includes(entry.document._id),
                  ),
                  reference,
                ]);
                onChange([...selectedIds, reference.document._id]);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
