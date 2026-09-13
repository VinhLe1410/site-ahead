import { useState } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { BriefContext } from "../job-brief-summary";
import { ArrowUpRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { summarizeJobBrief } from "../job-brief-summary";
import { PreVisitPreparation } from "./pre-visit-preparation";

export function JobNextActions({
  context,
  items,
  states,
  onOpenItem,
}: {
  context: BriefContext;
  items: Doc<"checklistItems">[];
  states: Doc<"checklistAgentStates">[] | undefined;
  onOpenItem: (itemId: string, trigger: HTMLButtonElement) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const summary =
    states === undefined
      ? undefined
      : summarizeJobBrief(context, items, states);

  return (
    <section aria-labelledby="next-actions-heading" className="py-6">
      <h2 id="next-actions-heading" className="text-lg font-semibold">
        Your next actions
      </h2>
      {summary === undefined ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Loading next actions...
        </p>
      ) : summary.actions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No outstanding checklist actions. Review the saved evidence before
          proceeding.
        </p>
      ) : (
        <ul className="mt-2 divide-y">
          {(showAll ? summary.actions : summary.actions.slice(0, 3)).map(
            (entry) => {
              const draft = summary.drafts.some(
                (value) => value.itemId === entry.itemId,
              );

              const action = draft
                ? "Review draft"
                : entry.priority === 5
                  ? "View progress"
                  : "Open check";

              return (
                <li
                  key={entry.itemId}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium wrap-anywhere">
                      {entry.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                      {entry.detail}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={(event) =>
                      onOpenItem(entry.itemId, event.currentTarget)
                    }
                    aria-label={`${action}: ${entry.title}`}
                  >
                    {action}
                    <ArrowUpRightIcon className="size-3.5" />
                  </Button>
                </li>
              );
            },
          )}
        </ul>
      )}
      {summary && summary.actions.length > 3 && (
        <Button
          variant="link"
          size="sm"
          className="px-0"
          aria-expanded={showAll}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? "Show fewer actions"
            : `Show all ${summary.actions.length} actions`}
        </Button>
      )}
      <PreVisitPreparation key={context.job._id} jobId={context.job._id} />
    </section>
  );
}
