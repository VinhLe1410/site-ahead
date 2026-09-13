import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { getErrorMessage } from "../../../../shared/errors";
import { useDocumentTransfer } from "@/components/documents/use-document-transfer";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";

const sourceLabels = {
  database: "Saved job information",
  manual: "Contractor-confirmed information",
  live_api: "Live data",
  demo_data: "Fictional demo data",
};

function progressMessage(value: string) {
  switch (value) {
    case "no_exact_address_match":
    case "matching_address_has_no_construction_year":
      return "DataVic has no usable construction year for this address. Add a contractor-confirmed year in Job information, then process this item again.";
    case "confirmed_site_coordinates_required":
      return "Add the confirmed site latitude and longitude in Job information, then process this item again.";
    case "confirmed_road_and_locality_required":
      return "Add the road name and locality in Job information, then process this item again.";
    default:
      return value;
  }
}

export function ItemAgentProgress({
  item,
  state,
}: {
  item: Doc<"checklistItems">;
  state: Doc<"checklistAgentStates"> | undefined;
}) {
  const retry = useMutation(api.checklistExecution.retry);
  const { downloadDraft } = useDocumentTransfer();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const classifying = state?.classification.status === "running";
  const classificationFailed = state?.classification.status === "failed";
  const busy = classifying || state?.queued || state?.execution === "running";
  const humanOnly = item.kind === "on_site" && !classificationFailed;

  if (humanOnly || (state === undefined && item.status === "done")) return null;

  const status = classifying
    ? "Classifying"
    : classificationFailed
      ? "Classification failed"
      : state?.queued
        ? "Queued"
        : state?.execution === "running"
          ? "Working"
          : state?.execution === "failed"
            ? "Failed"
            : state?.execution === "waiting"
              ? "Waiting for you"
              : state?.execution === "finished"
                ? "Result saved"
                : "Ready to process";

  async function run() {
    setPending(true);
    setError(null);

    try {
      await retry({ itemId: item._id });
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not start this item. Try again."),
      );
    } finally {
      setPending(false);
    }
  }

  async function download() {
    if (state?.draft === undefined) return;
    setPending(true);
    setError(null);

    try {
      await downloadDraft(item._id, state.draft.filename);
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not download the draft. Try again."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-2 space-y-3 border-l-2 border-primary/30 pl-3 text-sm sm:ml-8">
      <p role="status" className="font-medium">
        {status}
        {busy && state?.currentStep && (
          <span className="font-normal text-muted-foreground">
            {" · "}
            {state.currentStep.replace(/_/g, " ")}
          </span>
        )}
      </p>
      {state?.nextAction && (
        <p className="text-muted-foreground">
          {progressMessage(state.nextAction)}
        </p>
      )}
      {(state?.error || state?.classification.error) && (
        <RequestError
          message={
            state.error ?? state.classification.error ?? "Processing failed."
          }
        />
      )}
      {state?.finding && (
        <div className="space-y-1">
          <p>{state.finding.summary}</p>
          <p className="text-xs text-muted-foreground">
            {state.finding.coverage}
          </p>
        </div>
      )}
      {state && state.missingInformation.length > 0 && (
        <div>
          <p className="font-medium">Needs your attention</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {state.missingInformation.map((field) => (
              <li key={field.field}>
                {field.label}
                {field.reason !== state.nextAction &&
                  `: ${progressMessage(field.reason)}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {state?.draft && (
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Demo draft. Review all details and complete the human fields before
            any use.
            {state.execution !== "waiting" &&
              " This file is from an earlier saved run."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void download()}
            aria-label={`Download draft for ${item.title}`}
          >
            Download draft
          </Button>
        </div>
      )}
      {state && state.provenance.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Information sources</summary>
          <ul className="mt-2 space-y-1">
            {state.provenance.map((source) => (
              <li
                key={`${source.method}-${source.source}-${source.reference ?? ""}`}
                className="wrap-anywhere"
              >
                {sourceLabels[source.method] ?? source.method}: {source.source}
                {" · "}
                {new Date(source.observedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </details>
      )}
      {item.status === "pending" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || Boolean(busy)}
          onClick={() => void run()}
          aria-label={`${classificationFailed ? "Retry classification" : "Process item"}: ${item.title}`}
        >
          {pending
            ? "Please wait..."
            : classificationFailed
              ? "Retry classification"
              : state?.draft
                ? "Regenerate draft"
                : "Process item"}
        </Button>
      )}
      {error !== null && <RequestError message={error} />}
    </div>
  );
}
