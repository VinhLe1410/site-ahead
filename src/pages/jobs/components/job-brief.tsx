import type { Doc } from "../../../../convex/_generated/dataModel";
import type { SnapshotContext } from "../../../../shared/item-agent-snapshots";
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
  const summary =
    states === undefined
      ? undefined
      : summarizeJobBrief(context, items, states);

  return (
    <section
      className="mt-8 max-w-3xl space-y-4"
      aria-labelledby="job-brief-heading"
    >
      <div>
        <h2 id="job-brief-heading" className="font-semibold">
          Job brief
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Based on the current saved checklist. Suggested next steps support
          your review; they are not a formal compliance or site-safety
          determination.
        </p>
      </div>
      {summary === undefined ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading current checklist progress...
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No checklist items yet. Add a checklist to build a work summary.
        </p>
      ) : (
        <div className="space-y-5 border-l-2 border-primary pl-4 text-sm">
          <p className="font-medium">
            {summary.completed.length} of {items.length} items marked done ·{" "}
            {summary.pending} pending
            {summary.drafts.length > 0 &&
              ` · ${summary.drafts.length} draft${summary.drafts.length === 1 ? "" : "s"} prepared`}
            {summary.processing > 0 && ` · ${summary.processing} processing`}
          </p>
          <div>
            <h3 className="font-medium">Completed work</h3>
            {summary.completed.length === 0 ? (
              <p className="mt-1 text-muted-foreground">
                No checklist items are marked done yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {summary.completed.map((entry) => (
                  <li key={entry.itemId}>
                    <span className="font-medium">{entry.title}: </span>
                    <span className="text-muted-foreground">
                      {entry.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {summary.drafts.length > 0 && (
            <div>
              <h3 className="font-medium">
                Drafts prepared — requests still pending
              </h3>
              <ul className="mt-2 space-y-2">
                {summary.drafts.map((entry) => (
                  <li key={entry.itemId}>
                    <span className="font-medium">{entry.title}: </span>
                    <span className="text-muted-foreground">
                      {entry.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3 className="font-medium">Suggested next steps</h3>
            {summary.actions.length === 0 ? (
              <p className="mt-1 text-muted-foreground">
                No outstanding checklist actions are recorded. Review the saved
                evidence and any work requirements before proceeding.
              </p>
            ) : (
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                {summary.actions.map((entry) => (
                  <li key={entry.itemId}>
                    <span className="font-medium">{entry.title}: </span>
                    <span className="text-muted-foreground">
                      {entry.detail}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">
          Original job brief
        </summary>
        <p className="mt-3 leading-7 whitespace-pre-wrap wrap-anywhere">
          {context.input.processedText || "No original brief was saved."}
        </p>
      </details>
    </section>
  );
}
