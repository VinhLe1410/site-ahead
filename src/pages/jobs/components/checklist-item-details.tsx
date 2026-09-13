import type { DocumentSummary } from "../../../../convex/documentData";
import { DocumentDownload } from "@/components/documents/document-download";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { MessageSquareIcon } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";
import type { SnapshotContext } from "../../../../shared/item-agent-snapshots";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ChecklistKindBadge } from "./checklist-kind-badge";
import { ItemAgentProgress } from "./item-agent-progress";

export function ChecklistItemDetails({
  item,
  documents,
  agentState,
  context,
  editNote,
  loading,
}: {
  item: Doc<"checklistItems">;
  documents: DocumentSummary[];
  agentState: Doc<"checklistAgentStates"> | undefined;
  context: Omit<SnapshotContext, "item">;
  editNote: boolean;
  loading: boolean;
}) {
  const setNotes = useMutation(api.checklistItems.setNotes);
  const [notes, setLocalNotes] = useState(item.notes);
  const [editing, setEditing] = useState(editNote);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const noteAction = item.notes.length === 0 ? "Add note" : "Edit note";

  useEffect(() => {
    if (wasEditing.current && !editing) {
      noteButton.current?.focus();
    }

    wasEditing.current = editing;
  }, [editing]);

  async function saveNotes(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSavingNotes(true);

    try {
      await setNotes({ itemId: item._id, notes });
      setEditing(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the note. Try again.",
      );
    } finally {
      setIsSavingNotes(false);
    }
  }

  function closeEditor() {
    setEditing(false);
    setError(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <ChecklistKindBadge kind={item.kind} />
        <Button
          ref={noteButton}
          variant="ghost"
          size="sm"
          className={
            item.notes.length > 0 ? "text-foreground" : "text-muted-foreground"
          }
          aria-label={`${noteAction} for ${item.title}`}
          title={noteAction}
          aria-expanded={editing}
          aria-controls={editing ? `note-editor-${item._id}` : undefined}
          disabled={isSavingNotes}
          onClick={() => {
            if (editing) {
              closeEditor();
            } else {
              setLocalNotes(item.notes);
              setError(null);
              setEditing(true);
            }
          }}
        >
          <MessageSquareIcon />
          {noteAction}
        </Button>
      </div>
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading progress...
        </p>
      ) : (
        <ItemAgentProgress item={item} state={agentState} context={context} />
      )}
      {item.kind === "on_site" &&
        agentState?.classification.status !== "failed" && (
          <p className="text-sm text-muted-foreground">
            Complete this check yourself, record the outcome below, and mark it
            done on the checklist.
          </p>
        )}
      {!editing && item.notes.length > 0 && (
        <div className="space-y-2 text-sm">
          <h3 className="font-medium">Saved note</h3>
          <p className="leading-6 whitespace-pre-wrap wrap-anywhere">
            {item.notes}
          </p>
        </div>
      )}
      {(item.documentVersionIds?.length ?? 0) > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            Original forms and versions
          </summary>
          <ul
            className="mt-2 divide-y"
            aria-label={`Documents for ${item.title}`}
          >
            {item.documentVersionIds?.map((versionId) => {
              const reference = documents.find(
                (entry) => entry.version._id === versionId,
              );

              if (reference === undefined)
                throw new Error("Assigned document version is missing");

              return (
                <li
                  key={versionId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium wrap-anywhere">
                      {reference.document.title}
                    </p>
                    <p className="text-xs text-muted-foreground wrap-anywhere">
                      {reference.version.filename} · Version{" "}
                      {reference.version.number}
                      {reference.document.archived && " · Archived"}
                    </p>
                  </div>
                  <DocumentDownload version={reference.version} />
                </li>
              );
            })}
          </ul>
        </details>
      )}
      {editing && (
        <form
          id={`note-editor-${item._id}`}
          className="mt-2 space-y-3 pb-2"
          onSubmit={(event) => void saveNotes(event)}
        >
          <Field>
            <FieldLabel htmlFor={`notes-${item._id}`}>Note</FieldLabel>
            <Textarea
              id={`notes-${item._id}`}
              autoFocus
              value={notes}
              onChange={(event) => setLocalNotes(event.target.value)}
              disabled={isSavingNotes}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSavingNotes}>
              {isSavingNotes ? "Saving..." : "Save note"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSavingNotes}
              onClick={closeEditor}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {error !== null && (
        <div className="mt-3">
          <RequestError message={error} />
        </div>
      )}
    </div>
  );
}
