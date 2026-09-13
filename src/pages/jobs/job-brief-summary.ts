import type { Doc } from "../../../convex/_generated/dataModel";
import {
  executionSnapshot,
  type SnapshotContext,
} from "../../../shared/item-agent-snapshots";

type BriefContext = Omit<SnapshotContext, "item">;

type BriefEntry = { itemId: string; title: string; detail: string };

type SuggestedAction = BriefEntry & { priority: number };

type JobBriefSummary = {
  completed: BriefEntry[];
  drafts: BriefEntry[];
  actions: SuggestedAction[];
  processing: number;
  pending: number;
};

function findingSummary(
  finding: NonNullable<Doc<"checklistAgentStates">["finding"]>,
) {
  switch (finding.kind) {
    case "electrical_classification":
    case "simulated_certificate_delivery":
      return finding.summary;
    case "construction_year":
      return `${finding.constructionYear} (${finding.pre1990 ? "before 1990" : "1990 or later"}); ${finding.resolution === "manual_fallback" ? "contractor-confirmed year after DataVic had no usable year" : "DataVic exact-address record"}.`;
    case "air_quality":
      return `${finding.pollutant}: ${finding.value} ${finding.unit} at ${finding.stationName}, ${finding.distanceKm.toFixed(1)} km from the site. Nearby station reading, not a measurement at the property.`;
    case "road_closures":
      return `${finding.matchCount} published disruption${finding.matchCount === 1 ? "" : "s"} matched ${finding.roadName}, ${finding.locality}. See the road details for scope and timings; this does not establish a clear route.`;
  }
}

export function summarizeJobBrief(
  context: BriefContext,
  items: Doc<"checklistItems">[],
  states: Doc<"checklistAgentStates">[],
): JobBriefSummary {
  const summary: JobBriefSummary = {
    completed: [],
    drafts: [],
    actions: [],
    processing: 0,
    pending: 0,
  };

  for (const item of items) {
    const state = states.find((value) => value.itemId === item._id);
    const entry = { itemId: item._id, title: item.title };

    const busy =
      state?.queued ||
      state?.execution === "running" ||
      state?.classification.status === "running";

    const failed =
      state?.execution === "failed" ||
      state?.classification.status === "failed";

    // Successful automation changes only the checkbox after saving this pending snapshot.
    const current =
      state?.snapshot !== undefined &&
      state.snapshot ===
        executionSnapshot({ ...context, item: { ...item, status: "pending" } });

    const finding =
      current &&
      !busy &&
      !failed &&
      state?.classification.status === "succeeded" &&
      state.execution === "finished" &&
      item.kind === "automated"
        ? state.finding
        : undefined;

    const draft =
      current &&
      !busy &&
      !failed &&
      state?.classification.status === "succeeded" &&
      state.execution === "waiting" &&
      item.kind === "third_party"
        ? state.draft
        : undefined;

    if (item.status === "done") {
      summary.completed.push({
        ...entry,
        detail: finding
          ? findingSummary(finding)
          : "Marked done on the checklist. No current automated finding is recorded for this completion.",
      });

      if (finding?.kind === "road_closures" && finding.matchCount > 0)
        summary.actions.push({
          ...entry,
          priority: 4,
          detail:
            "Check the published impacts and timings before travel; plan site access or an alternative route where needed. A restriction is not necessarily a full closure.",
        });

      if (state?.finding && !finding && !busy)
        summary.actions.push({
          ...entry,
          priority: 1,
          detail:
            "An earlier result is available, but it is not current for this saved job. Review it and, if needed, uncheck this item and process it again.",
        });
      continue;
    }

    summary.pending += 1;

    if (busy) summary.processing += 1;

    if (item.kind === "on_site") {
      const humanAction = /asbestos/i.test(item.title)
        ? "Arrange a human asbestos/site assessment before work that could disturb materials."
        : "Arrange the human site or paperwork check, record the outcome, and mark it done when completed.";

      summary.actions.push({
        ...entry,
        priority: /asbestos/i.test(item.title) ? 0 : 2,
        detail:
          state?.classification.status === "failed"
            ? `Classification failed. Review the item error and retry classification; its saved kind remains a human check. ${humanAction}`
            : humanAction,
      });
      continue;
    }

    if (busy) {
      summary.actions.push({
        ...entry,
        priority: 5,
        detail:
          "Processing is underway. Wait for the saved outcome before relying on this check; earlier output does not complete this run.",
      });
      continue;
    }

    if (failed) {
      summary.actions.push({
        ...entry,
        priority: 1,
        detail: `Processing failed. Review the item error${state?.error || state?.classification.error ? ` (${state.error ?? state.classification.error})` : ""}, correct any missing information, then retry.`,
      });
      continue;
    }

    if (draft) {
      summary.drafts.push({
        ...entry,
        detail:
          "Unsigned demo draft prepared. The request is still pending; nothing has been sent or approved.",
      });
      summary.actions.push({
        ...entry,
        priority: 3,
        detail:
          draft.formKey === "building-permit-request"
            ? "Review the unsigned demo, confirm council/form suitability and the surveyor, and complete human fields before arranging the building-permit application for the applicable work. No permit or appointment is established."
            : draft.formKey === "occupancy-inspection-request"
              ? "Review the unsigned demo and council/form suitability. On completion, arrange the final inspection/application with the actual building-permit reference and supporting documents. No occupancy approval is established."
              : "Review the unsigned demo and human fields, then arrange the appropriate third party outside Site Ahead. No approval is established.",
      });
      continue;
    }

    const missing = current
      ? (state?.missingInformation.map((field) => field.label) ?? [])
      : [];

    summary.actions.push({
      ...entry,
      priority: item.kind === "automated" ? 1 : 3,
      detail:
        missing.length > 0
          ? `Provide or confirm: ${missing.join(", ")}. Then process this item again.`
          : state?.finding || state?.draft
            ? "Earlier output is available, but this item remains unresolved. Review the saved job information and process it again."
            : item.kind === "third_party"
              ? "Prepare the request, then review its requirements and arrange the appropriate third party. This item remains pending."
              : "Review the saved job information and process this unresolved check.",
    });
  }

  summary.actions.sort((a, b) => a.priority - b.priority);

  return summary;
}
