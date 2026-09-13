import { useState } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { SnapshotContext } from "../../../../shared/item-agent-snapshots";
import { Button } from "@/components/ui/button";
import { summarizeJobBrief } from "../job-brief-summary";

export function JobBrief({
  context,
  items,
  states,
}: {
  context: Omit<SnapshotContext, "item">;
  items: Doc<"checklistItems">[];
  states: Doc<"checklistAgentStates">[] | undefined;
}) {
  const [expanded, setExpanded] = useState(false);

  const summary =
    states === undefined
      ? undefined
      : summarizeJobBrief(context, items, states);

  return (
    <section
      className="space-y-3 border-b pb-6"
      aria-labelledby="job-brief-heading"
    >
      <h2
        id="job-brief-heading"
        className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
      >
        Job brief
      </h2>
      <p
        id="original-job-brief"
        className={`max-w-3xl text-base leading-7 whitespace-pre-wrap wrap-anywhere ${expanded || context.input.processedText.length <= 180 ? "" : "line-clamp-3"}`}
      >
        {context.input.processedText || "No original brief was saved."}
      </p>
      {context.input.processedText.length > 180 && (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          aria-expanded={expanded}
          aria-controls="original-job-brief"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Read original job brief"}
        </Button>
      )}
      <p className="text-sm text-muted-foreground" role="status">
        {summary === undefined ? (
          "Loading checklist progress..."
        ) : items.length === 0 ? (
          "No checklist items."
        ) : (
          <>
            <span className="font-medium text-foreground">
              {summary.completed.length} of {items.length}
            </span>{" "}
            checks marked done
            {summary.drafts.length > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="font-medium text-foreground">
                  {summary.drafts.length}
                </span>{" "}
                demo {summary.drafts.length === 1 ? "draft" : "drafts"} prepared
              </>
            )}
            {summary.processing > 0 && <> · {summary.processing} processing</>}
          </>
        )}
      </p>
    </section>
  );
}
