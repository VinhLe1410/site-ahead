import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { getErrorMessage } from "../../../../shared/errors";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { RequestError } from "@/components/layout/request-error";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function PreparationClientMessage({
  jobId,
  message,
  stale,
  canRegenerate,
  hasQuestions,
}: {
  jobId: Id<"jobs">;
  message: Doc<"jobPreparations">["message"];
  stale: boolean;
  canRegenerate: boolean;
  hasQuestions: boolean;
}) {
  const saveMessage = useMutation(api.jobPreparation.saveMessage);
  const regenerateMessage = useMutation(api.jobPreparation.regenerateMessage);

  const [edit, setEdit] = useState<{ text: string; revision: number } | null>(
    null,
  );

  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const savedRevision = message?.revision ?? 0;
  const text = edit?.text ?? message?.text ?? "";
  const changedElsewhere = edit !== null && edit.revision !== savedRevision;

  async function save() {
    setWorking(true);
    setError(null);
    setNotice(null);

    try {
      await saveMessage({
        jobId,
        text,
        expectedRevision: edit?.revision ?? savedRevision,
      });
      setEdit(null);
      setNotice("Message saved for your organization.");
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not save the message. Try again."),
      );
    } finally {
      setWorking(false);
    }
  }

  async function regenerate() {
    setWorking(true);
    setError(null);
    setNotice(null);

    try {
      await regenerateMessage({ jobId, expectedRevision: savedRevision });
      setEdit(null);
      setNotice(
        "Message regenerated from the current pending client questions.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function regenerateWithoutConfirmation() {
    try {
      await regenerate();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not regenerate the message."));
    }
  }

  async function copy() {
    setError(null);
    setNotice(null);

    try {
      await navigator.clipboard.writeText(text);
      setNotice(
        "Message copied. Send it yourself using your usual messaging app.",
      );
    } catch {
      setError(
        "Copy failed. You can select and copy the message text manually.",
      );
    }
  }

  return (
    <div className="space-y-3 border-t px-4 py-5 sm:px-5">
      <div>
        <h3 className="font-medium">Client message</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drafted from pending client questions. Review, edit and copy it to
          send yourself. Nothing is sent from Site Ahead.
        </p>
      </div>
      {stale && message?.text && (
        <p className="text-sm text-amber-800 dark:text-amber-300" role="status">
          Preparation or job details changed. This saved message may contain
          outdated questions. Review it or regenerate from fresh preparation.
        </p>
      )}
      {changedElsewhere && (
        <div className="space-y-2">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            A newer message was saved while you were editing. Your unsaved text
            is still here; copy it before loading the latest version.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={working}
            onClick={() => {
              setEdit(null);
              setError(null);
              setNotice(null);
            }}
          >
            Use latest saved message
          </Button>
        </div>
      )}
      {!hasQuestions && !text && edit === null ? (
        <p className="text-sm text-muted-foreground">
          No pending client questions need a message.
        </p>
      ) : (
        <>
          <Field>
            <FieldLabel htmlFor="preparation-client-message">
              Message draft
            </FieldLabel>
            <Textarea
              id="preparation-client-message"
              value={text}
              maxLength={4000}
              rows={8}
              disabled={working}
              onChange={(event) => {
                setEdit({
                  text: event.target.value,
                  revision: edit?.revision ?? savedRevision,
                });
                setError(null);
                setNotice(null);
              }}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={
                working || changedElsewhere || (edit === null && !stale)
              }
              onClick={() => void save()}
            >
              {working
                ? "Saving…"
                : stale && edit === null
                  ? "Save reviewed message"
                  : "Save message"}
            </Button>
            <Button
              variant="outline"
              disabled={working || !text.trim()}
              onClick={() => void copy()}
            >
              Copy message
            </Button>
            {!canRegenerate || working ? (
              <Button variant="outline" disabled>
                Regenerate message
              </Button>
            ) : edit !== null || message?.edited ? (
              <ConfirmDialog
                trigger="Regenerate message"
                title="Replace this message draft?"
                description="This replaces the saved draft and your unsaved edits with the current pending client questions. Completed, dismissed and internal tasks are omitted."
                confirmLabel="Regenerate message"
                onConfirm={regenerate}
              />
            ) : (
              <Button
                variant="outline"
                onClick={() => void regenerateWithoutConfirmation()}
              >
                Regenerate message
              </Button>
            )}
          </div>
          {!canRegenerate && (
            <p className="text-xs text-muted-foreground">
              Refresh preparation to draft from the latest job details.
            </p>
          )}
          {edit !== null && !changedElsewhere && (
            <p className="text-xs text-muted-foreground">Unsaved edits</p>
          )}
        </>
      )}
      {error && <RequestError message={error} />}
      {notice && (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
