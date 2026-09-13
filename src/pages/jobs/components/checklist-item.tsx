import type { DocumentSummary } from "../../../../convex/documentData";
import { DocumentDownload } from "@/components/documents/document-download";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { MessageSquareIcon } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ChecklistKindBadge } from "./checklist-kind-badge";
import { ItemAgentProgress } from "./item-agent-progress";

export function ChecklistItem({
  item,
  documents,
  agentState,
}: {
  item: Doc<"checklistItems">;
  documents: DocumentSummary[];
  agentState: Doc<"checklistAgentStates"> | undefined;
}) {
  const setStatus = useMutation(api.checklistItems.setStatus);
  const setNotes = useMutation(api.checklistItems.setNotes);
  const [notes, setLocalNotes] = useState(item.notes);
  const [editing, setEditing] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
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

  async function updateStatus(checked: boolean) {
    setError(null);
    setIsSavingStatus(true);

    try {
      await setStatus({
        itemId: item._id,
        status: checked ? "done" : "pending",
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update this item. Try again.",
      );
    } finally {
      setIsSavingStatus(false);
    }
  }

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
    <li className="px-4 py-3 sm:px-5">
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-3">
        <Checkbox
          id={`item-${item._id}`}
          aria-labelledby={`item-title-${item._id}`}
          className="mt-2.5"
          checked={item.status === "done"}
          onCheckedChange={(checked) => void updateStatus(checked)}
          disabled={isSavingStatus}
        />
        <div className="min-w-0 py-2">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <label
              id={`item-title-${item._id}`}
              htmlFor={`item-${item._id}`}
              className="min-w-0 cursor-pointer text-sm leading-6 font-medium wrap-anywhere"
            >
              {item.title}
            </label>
            <ChecklistKindBadge kind={item.kind} />
          </div>
          {!editing && item.notes.length > 0 && (
            <p className="mt-2 line-clamp-2 border-l-2 pl-3 text-sm leading-6 whitespace-pre-wrap text-muted-foreground wrap-anywhere">
              {item.notes}
            </p>
          )}
        </div>
        <Button
          ref={noteButton}
          variant="ghost"
          size="icon"
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
        </Button>
      </div>
      {(item.documentVersionIds?.length ?? 0) > 0 && (
        <ul
          className="mt-2 divide-y border-t sm:ml-8"
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
      )}
      <ItemAgentProgress item={item} state={agentState} />
      {editing && (
        <form
          id={`note-editor-${item._id}`}
          className="mt-2 space-y-3 pb-2 sm:ml-8"
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
        <div className="mt-3 sm:ml-8">
          <RequestError message={error} />
        </div>
      )}
    </li>
  );
}
