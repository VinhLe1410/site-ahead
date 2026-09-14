import { useState } from "react";
import { useMutation } from "convex/react";
import { MessageSquareIcon } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { BriefContext } from "../job-brief-summary";
import { getErrorMessage } from "../../../../shared/errors";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { checklistKindLabels } from "../job-labels";
import { currentItemOutput } from "../job-brief-summary";

function itemSummary(
  context: BriefContext,
  item: Doc<"checklistItems">,
  state: Doc<"checklistAgentStates"> | undefined,
  loading: boolean,
) {
  if (loading) return { text: "Loading progress..." };

  const { busy, failed, finding, draft } = currentItemOutput(
    context,
    item,
    state,
  );

  if (busy) return { text: state?.queued ? "Queued" : "Processing" };

  if (failed) return { text: "Needs attention · Processing failed" };

  if (item.status === "done" && finding) {
    switch (finding.kind) {
      case "electrical_classification":
        return {
          text: `${finding.classification.replace(/_/g, " ")} work`,
          caveat:
            "Based on the saved scope. Confirm the actual work before use.",
        };
      case "simulated_certificate_delivery":
        return {
          text: "Delivery simulated",
          caveat: "PoC only — no email sent.",
        };
      case "construction_year":
        return {
          text: `${finding.constructionYear} · ${finding.resolution === "manual_fallback" ? "Contractor-confirmed" : "DataVic"}`,
        };
      case "air_quality":
        return {
          text: `${finding.pollutant}: ${finding.value} ${finding.unit}`,
          caveat: `Nearby station, ${finding.distanceKm.toFixed(1)} km away. Not measured at the property.`,
        };
      case "road_closures":
        return {
          text: `${finding.matchCount} published ${finding.matchCount === 1 ? "disruption" : "disruptions"} matched`,
          caveat: `Exact road: ${finding.roadName}, ${finding.locality}. Does not establish clear access.`,
        };
    }
  }

  if (item.status === "done")
    return {
      text: "Marked done",
      caveat: state?.finding
        ? "Earlier result. Not current for this job."
        : undefined,
    };

  if (draft)
    return {
      text: "Demo draft ready",
      caveat: "Nothing submitted or approved.",
    };

  if (item.kind === "on_site") return { text: "Human check required" };

  if (state?.finding || state?.draft || state?.requestDraft)
    return { text: "Earlier output · Needs review" };

  if (state?.execution === "waiting") return { text: "Needs information" };

  return { text: "Ready to process" };
}

export function ChecklistItem({
  item,
  agentState,
  context,
  loading,
  selected,
  onOpen,
}: {
  item: Doc<"checklistItems">;
  agentState: Doc<"checklistAgentStates"> | undefined;
  context: BriefContext;
  loading: boolean;
  selected: boolean;
  onOpen: (trigger: HTMLButtonElement, editNote?: boolean) => void;
}) {
  const setStatus = useMutation(api.checklistItems.setStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = itemSummary(context, item, agentState, loading);
  const noteAction = item.notes.length === 0 ? "Add note" : "Edit note";

  async function updateStatus(checked: boolean) {
    setSaving(true);
    setError(null);

    try {
      await setStatus({
        itemId: item._id,
        status: checked ? "done" : "pending",
      });
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not update this item. Try again."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className={`py-3.5 ${selected ? "bg-primary/5" : ""}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={`item-${item._id}`}
          className="mt-1"
          checked={item.status === "done"}
          disabled={saving}
          onCheckedChange={(checked) => void updateStatus(checked)}
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`item-${item._id}`}
            className="cursor-pointer text-sm font-medium leading-6 wrap-anywhere"
          >
            {item.title}
          </label>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {checklistKindLabels[item.kind]} · {summary.text}
          </p>
          {summary.caveat && (
            <p className="text-xs leading-5 text-muted-foreground">
              {summary.caveat}
            </p>
          )}
          {item.notes && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              Note: {item.notes}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${noteAction} for ${item.title}`}
            title={noteAction}
            onClick={(event) => onOpen(event.currentTarget, true)}
          >
            <MessageSquareIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Details: ${item.title}`}
            aria-expanded={selected}
            onClick={(event) => onOpen(event.currentTarget)}
          >
            Details
          </Button>
        </div>
      </div>
      {error && (
        <div className="mt-2">
          <RequestError message={error} />
        </div>
      )}
    </li>
  );
}
