import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { getErrorMessage } from "../../../../shared/errors";
import { PageHeading } from "@/components/layout/page-heading";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";
import { DraftFields, type DraftValues } from "./draft-fields";
import { IntakeConversation } from "./intake-conversation";

const emptyDraft: DraftValues = {
  processedText: "",
  addressText: "",
  categoryId: null,
};

export function NewJobPage() {
  const draft = useQuery(api.jobDrafts.current, {});

  return (
    <>
      <PageHeading title="New job" />
      {draft === undefined ? (
        <div
          role="status"
          className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" /> Loading your draft…
        </div>
      ) : (
        <DraftWorkspace draft={draft} />
      )}
    </>
  );
}

function DraftWorkspace({ draft }: { draft: Doc<"jobDrafts"> | null }) {
  const save = useMutation(api.jobDrafts.save);
  const send = useMutation(api.jobDrafts.send);
  const retry = useMutation(api.jobDrafts.retry);
  const createJob = useMutation(api.jobDrafts.createJob);
  const navigate = useNavigate();

  const [edits, setEdits] = useState<{
    values: DraftValues;
    revision: number;
  } | null>(null);

  const [pending, setPending] = useState<
    "save" | "send" | "retry" | "create" | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const values = edits?.values ?? draft ?? emptyDraft;
  const isGenerating = draft?.runId !== undefined;
  const disabled = pending !== null || isGenerating;

  const hasConflict =
    edits !== null && edits.revision !== (draft?.revision ?? 0);

  async function flushDraft() {
    if (edits === null && draft !== null)
      return { draftId: draft._id, revision: draft.revision };

    const revision = edits?.revision ?? draft?.revision ?? 0;

    const draftId = await save({
      draftId: draft?._id,
      revision,
      processedText: values.processedText,
      addressText: values.addressText,
      categoryId: values.categoryId,
    });

    setEdits(null);

    return { draftId, revision: revision + 1 };
  }

  async function handleSave() {
    setPending("save");
    setError(null);

    try {
      await flushDraft();
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not save your draft. Try again."));
    } finally {
      setPending(null);
    }
  }

  async function handleSend(text: string) {
    setPending("send");
    setError(null);

    try {
      const { draftId } = await flushDraft();
      await send({ draftId, text });
    } finally {
      setPending(null);
    }
  }

  async function handleRetry() {
    if (draft === null || edits !== null) return;

    setPending("retry");
    setError(null);

    try {
      await retry({ draftId: draft._id });
    } catch (cause) {
      setError(
        getErrorMessage(cause, "Could not retry this message. Try again."),
      );
    } finally {
      setPending(null);
    }
  }

  async function handleCreate() {
    setPending("create");
    setError(null);

    try {
      const reviewedDraft = await flushDraft();
      const jobId = await createJob(reviewedDraft);
      void navigate(`/app/jobs/${jobId}`);
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not create your job. Try again."));
      setPending(null);
    }
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
      <section aria-labelledby="draft-heading" className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="draft-heading" className="text-lg font-semibold">
            Job brief
          </h2>
          <span role="status" className="text-xs text-muted-foreground">
            {pending === "save"
              ? "Saving…"
              : edits !== null
                ? "Unsaved changes"
                : draft !== null
                  ? "Draft saved"
                  : "Not saved yet"}
          </span>
        </div>
        <div className="space-y-5">
          <DraftFields
            values={values}
            disabled={disabled}
            onChange={(nextValues) =>
              setEdits({
                values: nextValues,
                revision: edits?.revision ?? draft?.revision ?? 0,
              })
            }
          />
          {hasConflict && (
            <div role="alert" className="space-y-3 border p-3 text-sm">
              <p>
                The saved draft changed in another tab. Your edits are still
                here. Load the saved draft before editing again.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setEdits(null);
                  setError(null);
                }}
              >
                Use saved draft
              </Button>
            </div>
          )}
          {error !== null && <RequestError message={error} />}
        </div>
        <div className="mt-5 border-t pt-5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-auto min-h-10 whitespace-normal"
              disabled={
                disabled ||
                hasConflict ||
                !values.processedText.trim() ||
                !values.addressText.trim()
              }
              onClick={() => void handleCreate()}
            >
              {pending === "create" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Creating job…
                </>
              ) : (
                <>
                  {values.categoryId === null
                    ? "Create job"
                    : "Create job and start checks"}{" "}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || hasConflict || edits === null}
              onClick={() => void handleSave()}
            >
              Save draft
            </Button>
          </div>
        </div>
      </section>
      <IntakeConversation
        draft={draft}
        disabled={disabled || hasConflict}
        isGenerating={isGenerating}
        hasUnsavedChanges={edits !== null}
        onSend={handleSend}
        onRetry={() => void handleRetry()}
      />
    </div>
  );
}
