import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { getErrorMessage } from "../../../../shared/errors";
import { useDocumentTransfer } from "@/components/documents/use-document-transfer";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";
import type { SnapshotContext } from "../../../../shared/item-agent-snapshots";
import { currentItemOutput } from "../job-brief-summary";
import { RoadFindingDetails } from "./road-finding-details";

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
  context,
}: {
  item: Doc<"checklistItems">;
  state: Doc<"checklistAgentStates"> | undefined;
  context: Omit<SnapshotContext, "item">;
}) {
  const retry = useMutation(api.checklistExecution.retry);
  const { downloadDraft } = useDocumentTransfer();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const classifying = state?.classification.status === "running";
  const classificationFailed = state?.classification.status === "failed";

  const { busy, failed, current, finding, draft, nextAction } =
    currentItemOutput(context, item, state);

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
          : failed
            ? "Failed"
            : item.status === "done"
              ? "Marked done"
              : (state?.finding || state?.draft) && !current
                ? "Earlier output · Needs review"
                : state?.execution === "waiting"
                  ? "Waiting for you"
                  : state?.execution === "finished"
                    ? "Earlier result · Item reopened"
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
    <div className="space-y-4 text-sm">
      <p role="status" className="font-medium">
        {status}
        {busy && state?.currentStep && (
          <span className="font-normal text-muted-foreground">
            {" · "}
            {state.currentStep.replace(/_/g, " ")}
          </span>
        )}
      </p>
      {state?.draft && (
        <div className="space-y-2">
          <p className="leading-6 text-muted-foreground">
            Demo draft. Nothing submitted or approved. Council and form
            suitability are unverified. Review the details and complete the
            human fields before use.
            {(!draft || item.status === "done") &&
              " This file is from an earlier saved run."}
          </p>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={pending}
            onClick={() => void download()}
            aria-label={`Download draft for ${item.title}`}
          >
            Download draft
          </Button>
        </div>
      )}
      {nextAction && (
        <p className="text-muted-foreground">{progressMessage(nextAction)}</p>
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
          {(!finding || item.status !== "done") && (
            <p className="text-xs font-medium text-muted-foreground">
              Earlier saved result; this item is not currently resolved by this
              result.
            </p>
          )}
          <p>{state.finding.summary}</p>
          {state.finding.kind !== "road_closures" && (
            <p className="text-xs text-muted-foreground">
              {state.finding.coverage}
            </p>
          )}
          {state.finding.kind === "road_closures" && (
            <RoadFindingDetails finding={state.finding} />
          )}
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
                : failed
                  ? "Retry check"
                  : "Process item"}
        </Button>
      )}
      {error !== null && <RequestError message={error} />}
    </div>
  );
}
