import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { PageHeading } from "@/components/layout/page-heading";
import { RequestError } from "@/components/layout/request-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { checklistKindLabels, jobStatusLabels } from "@/pages/jobs/job-labels";

function ChecklistItem({ item }: { item: Doc<"checklistItems"> }) {
  const setStatus = useMutation(api.checklistItems.setStatus);
  const setNotes = useMutation(api.checklistItems.setNotes);
  const [notes, setLocalNotes] = useState(item.notes);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(checked: boolean) {
    setError(null);
    setIsSavingStatus(true);

    try {
      await setStatus({
        itemId: item._id,
        status: checked ? "done" : "pending",
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update this item. Please try again.",
      );
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function saveNotes() {
    setError(null);
    setIsSavingNotes(true);

    try {
      await setNotes({ itemId: item._id, notes });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save notes. Please try again.",
      );
    } finally {
      setIsSavingNotes(false);
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-start gap-3">
          <Checkbox
            id={`item-${item._id}`}
            checked={item.status === "done"}
            onCheckedChange={(checked) => void updateStatus(checked)}
            disabled={isSavingStatus}
          />
          <label htmlFor={`item-${item._id}`}>{item.title}</label>
        </CardTitle>
        <CardDescription>
          <Badge variant="outline">{checklistKindLabels[item.kind]}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field>
          <FieldLabel htmlFor={`notes-${item._id}`}>Notes</FieldLabel>
          <Textarea
            id={`notes-${item._id}`}
            value={notes}
            onChange={(event) => setLocalNotes(event.target.value)}
            disabled={isSavingNotes}
          />
        </Field>
        <Button
          variant="outline"
          onClick={() => void saveNotes()}
          disabled={isSavingNotes}
        >
          {isSavingNotes ? "Saving..." : "Save notes"}
        </Button>
        {error !== null && <RequestError message={error} />}
      </CardContent>
    </Card>
  );
}

function JobDetails({
  data,
}: {
  data: {
    job: Doc<"jobs">;
    input: Doc<"inputs">;
    categoryTitle: string | null;
    checklist: Doc<"checklistItems">[];
  };
}) {
  const setStatus = useMutation(api.jobs.setStatus);
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
        description={data.categoryTitle ?? "Uncategorized"}
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processed text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {data.input.processedText}
              </p>
            </CardContent>
          </Card>
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Checklist</h2>
            {data.checklist.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {data.categoryTitle === null
                  ? "This job is uncategorized and has no checklist items."
                  : "This job has no checklist items."}
              </p>
            ) : (
              data.checklist.map((item) => (
                <ChecklistItem key={item._id} item={item} />
              ))
            )}
          </section>
        </div>
        <aside>
          <Card>
            <CardHeader>
              <CardTitle>Job details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="mt-1 text-sm">{data.job.addressText}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="mt-1 text-sm">
                  {data.categoryTitle ?? "Uncategorized"}
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="job-status">Status</FieldLabel>
                <Select
                  value={data.job.status}
                  onValueChange={(status) => void updateStatus(status)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="job-status" className="w-full">
                    <SelectValue>
                      {jobStatusLabels[data.job.status]}
                    </SelectValue>
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
              {error !== null && <RequestError message={error} />}
            </CardContent>
          </Card>
        </aside>
      </div>
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

  return <JobDetails data={data} />;
}
