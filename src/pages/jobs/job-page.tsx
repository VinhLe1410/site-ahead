import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { JobForm } from "./components/job-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeading } from "@/components/layout/page-heading";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jobStatusLabels } from "@/pages/jobs/job-labels";
import { ChecklistItem } from "./components/checklist-item";
import { JobAgentControls } from "./components/job-agent-controls";
import { JobBrief } from "./components/job-brief";
import { PreVisitPreparation } from "./components/pre-visit-preparation";

function JobDetails({
  data,
}: {
  data: NonNullable<FunctionReturnType<typeof api.jobs.get>>;
}) {
  const setStatus = useMutation(api.jobs.setStatus);
  const update = useMutation(api.jobs.update);
  const remove = useMutation(api.jobs.remove);

  const agentStates = useQuery(api.checklistExecution.list, {
    jobId: data.job._id,
  });

  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: Doc<"jobs">["status"] | null) {
    if (status === null) return;
    setError(null);
    setIsSaving(true);

    try {
      await setStatus({ jobId: data.job._id, status });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update job status. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        title={data.job.addressText}
        action={
          <div className="flex flex-wrap gap-2">
            <Dialog open={editing} onOpenChange={setEditing}>
              <DialogTrigger
                render={<Button variant="outline" aria-label="Edit job" />}
              >
                Edit job
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Edit job</DialogTitle>
                  <DialogDescription>
                    Changes apply to everyone in your organization.
                  </DialogDescription>
                </DialogHeader>
                <JobForm
                  editing
                  initialValues={{
                    processedText: data.input.processedText,
                    addressText: data.job.addressText,
                    categoryId: data.job.categoryId ?? null,
                  }}
                  initialCategoryTitle={data.categoryTitle}
                  onSubmit={async (values) => {
                    await update({ jobId: data.job._id, ...values });
                    setEditing(false);
                  }}
                />
              </DialogContent>
            </Dialog>
            <ConfirmDialog
              trigger="Delete job"
              title={`Delete ${data.job.addressText}?`}
              description="This deletes the job and its checklist for everyone in your organization."
              confirmLabel="Delete job"
              onConfirm={async () => {
                await remove({ jobId: data.job._id });
                void navigate("/app/jobs", { replace: true });
              }}
            />
          </div>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <p className="min-w-0 text-sm text-muted-foreground wrap-anywhere">
          {data.categoryTitle ?? "Uncategorized"}
        </p>
        <Field orientation="horizontal" className="w-auto">
          <FieldLabel htmlFor="job-status">Status</FieldLabel>
          <Select
            value={data.job.status}
            onValueChange={(status) => void updateStatus(status)}
            disabled={isSaving}
          >
            <SelectTrigger id="job-status" className="min-w-36">
              <SelectValue>{jobStatusLabels[data.job.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(jobStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {error !== null && (
        <div className="mb-4">
          <RequestError message={error} />
        </div>
      )}
      <section className="border bg-card" aria-labelledby="checklist-heading">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-5">
          <h2 id="checklist-heading" className="font-semibold">
            Checklist
          </h2>
          {data.checklist.length > 0 && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {data.checklist.filter((item) => item.status === "done").length} /{" "}
              {data.checklist.length} done
            </span>
          )}
        </div>
        {data.checklist.length > 0 && (
          <JobAgentControls
            job={data.job}
            items={data.checklist}
            busy={
              agentStates === undefined ||
              agentStates.some(
                (state) =>
                  state.queued ||
                  state.execution === "running" ||
                  state.classification.status === "running",
              )
            }
          />
        )}
        {data.checklist.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            No checklist items.
          </p>
        ) : (
          <ul className="divide-y">
            {data.checklist.map((item) => (
              <ChecklistItem
                key={item._id}
                item={item}
                documents={data.documents}
                agentState={agentStates?.find(
                  (state) => state.itemId === item._id,
                )}
              />
            ))}
          </ul>
        )}
      </section>
      <PreVisitPreparation key={data.job._id} jobId={data.job._id} />
      <JobBrief
        context={{
          job: data.job,
          input: data.input,
          category: data.categoryTitle ? { title: data.categoryTitle } : null,
        }}
        items={data.checklist}
        states={agentStates}
      />
    </>
  );
}

export function JobPage() {
  const { jobId } = useParams();
  const data = useQuery(api.jobs.get, { jobId: jobId ?? "" });

  if (data === undefined)
    return <p className="text-sm text-muted-foreground">Loading job...</p>;

  if (data === null)
    return (
      <>
        <PageHeading title="Job not found" />
        <p className="text-sm text-muted-foreground">
          This job does not exist or you cannot access it.
        </p>
      </>
    );

  return <JobDetails key={data.job._id} data={data} />;
}
