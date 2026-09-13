import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getErrorMessage } from "../../../../shared/errors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RequestError } from "@/components/layout/request-error";
import { PreparationClientMessage } from "./preparation-client-message";

export function PreVisitPreparation({ jobId }: { jobId: Id<"jobs"> }) {
  const data = useQuery(api.jobPreparation.get, { jobId });
  const start = useMutation(api.jobPreparationGeneration.start);
  const setStatus = useMutation(api.jobPreparation.setStatus);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function perform(operation: () => Promise<null>) {
    setWorking(true);
    setError(null);

    try {
      await operation();
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not update preparation. Try again."),
      );
    } finally {
      setWorking(false);
    }
  }

  const record = data?.record;
  const entries = record?.entries ?? [];
  const visible = entries.filter((entry) => entry.status !== "dismissed");
  const completed = entries.filter((entry) => entry.status === "done").length;
  const dismissed = entries.length - visible.length;
  const running = record?.generation === "running";

  const pendingStale = entries.some(
    (entry) =>
      entry.status === "pending" && data?.staleEntryIds.includes(entry.id),
  );

  return (
    <section
      className="mt-6 border bg-card"
      aria-labelledby="preparation-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
        <div>
          <h2 id="preparation-heading" className="font-semibold">
            Before the visit
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-generated preparation. Review the reasons and check off work
            yourself.
          </p>
        </div>
        {data?.supported && (
          <Button
            variant="outline"
            disabled={
              working ||
              running ||
              completed === 3 ||
              Boolean(data.contextError)
            }
            onClick={() => void perform(() => start({ jobId }))}
          >
            {running
              ? "Preparing…"
              : record
                ? "Refresh preparation"
                : "Generate preparation"}
          </Button>
        )}
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        {data === undefined && (
          <p className="text-sm text-muted-foreground" role="status">
            Loading preparation…
          </p>
        )}
        {data === null && (
          <p className="text-sm text-muted-foreground">
            Preparation is unavailable for this job.
          </p>
        )}
        {data && !data.supported && (
          <p className="text-sm text-muted-foreground">
            Preparation guidance is currently available for Carpentry &amp;
            Renovation jobs.
          </p>
        )}
        {data?.contextError && <RequestError message={data.contextError} />}
        {record?.error && <RequestError message={record.error} />}
        {error && <RequestError message={error} />}
        {running && (
          <p className="text-sm text-muted-foreground" role="status">
            Finding useful preparation from the saved job details…
          </p>
        )}
        {data?.stale && (
          <p
            className="text-sm text-amber-800 dark:text-amber-300"
            role="status"
          >
            Job details or findings changed. Refresh preparation to use the
            latest information. Completed tasks keep their original job details.
          </p>
        )}
        {data?.supported && !record && (
          <p className="text-sm text-muted-foreground">
            Generate a few useful actions from this job’s description before the
            first site visit.
          </p>
        )}
        {record?.generation === "succeeded" && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No additional meaningful preparation was identified. This does not
            establish that the job is safe or ready.
          </p>
        )}
        {visible.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {completed} / {visible.length} preparation items done
          </p>
        )}
        {dismissed > 0 && (
          <p className="text-sm text-muted-foreground">
            {dismissed} dismissed {dismissed === 1 ? "item" : "items"}.
            Dismissed actions are excluded when refreshing the same job context.
          </p>
        )}
        {completed === 3 && (
          <p className="text-sm text-muted-foreground">
            All three preparation slots are completed. Reopen or dismiss an item
            to make room for refreshed suggestions.
          </p>
        )}
      </div>
      {visible.length > 0 && (
        <ul className="divide-y border-t">
          {visible.map((entry) => (
            <li key={entry.id} className="px-4 py-4 sm:px-5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`preparation-${entry.id}`}
                  checked={entry.status === "done"}
                  disabled={working}
                  className="mt-1"
                  onCheckedChange={(checked) =>
                    void perform(() =>
                      setStatus({
                        jobId,
                        entryId: entry.id,
                        status: checked ? "done" : "pending",
                      }),
                    )
                  }
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <label
                    htmlFor={`preparation-${entry.id}`}
                    className="block cursor-pointer text-sm font-medium wrap-anywhere"
                  >
                    {entry.action}
                  </label>
                  <p className="text-sm text-muted-foreground wrap-anywhere">
                    {entry.rationale}
                  </p>
                  <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground wrap-anywhere">
                    “{entry.excerpt}”
                  </blockquote>
                  {data?.staleEntryIds.includes(entry.id) && (
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Based on earlier job details
                    </p>
                  )}
                  {!entry.clientQuestion && (
                    <p className="text-xs text-muted-foreground">
                      For your preparation; omitted from the client message.
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={working}
                  aria-label={`Dismiss preparation: ${entry.action}`}
                  onClick={() =>
                    void perform(() =>
                      setStatus({
                        jobId,
                        entryId: entry.id,
                        status: "dismissed",
                      }),
                    )
                  }
                >
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {record && (
        <PreparationClientMessage
          jobId={jobId}
          message={record.message}
          stale={data?.messageStale ?? false}
          canRegenerate={Boolean(
            data?.supported && !data.contextError && !pendingStale && !running,
          )}
          hasQuestions={entries.some(
            (entry) =>
              entry.status === "pending" && entry.clientQuestion !== null,
          )}
        />
      )}
    </section>
  );
}
