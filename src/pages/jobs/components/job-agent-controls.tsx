import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { getErrorMessage } from "../../../../shared/errors";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const contextFields = [
  { name: "latitude", label: "Site latitude", type: "number" },
  { name: "longitude", label: "Site longitude", type: "number" },
  { name: "roadName", label: "Road name", type: "text" },
  { name: "locality", label: "Suburb or locality", type: "text" },
  { name: "clientName", label: "Applicant or client name", type: "text" },
  { name: "contractorName", label: "Contractor name", type: "text" },
  { name: "contractorEmail", label: "Contractor email", type: "email" },
  { name: "contractorPhone", label: "Contractor phone", type: "text" },
  {
    name: "contractorLicence",
    label: "Confirmed contractor licence",
    type: "text",
  },
  { name: "plannedStartDate", label: "Planned start date", type: "date" },
] as const;

function text(form: FormData, key: string) {
  const value = form.get(key);

  if (value instanceof File) throw new Error(`${key} must be text.`);

  return value?.trim() || undefined;
}

function number(form: FormData, key: string) {
  const value = text(form, key);

  return value === undefined ? undefined : Number(value);
}

function JobContextFields({ job }: { job: Doc<"jobs"> }) {
  const setFields = useMutation(api.jobAgentContext.setFields);

  const setConstructionYear = useMutation(
    api.jobAgentContext.setConstructionYear,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>, yearOnly: boolean) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    setSaved(null);

    try {
      if (yearOnly) {
        await setConstructionYear({
          jobId: job._id,
          year: number(form, "year") ?? null,
        });
      } else {
        await setFields({
          jobId: job._id,
          fields: {
            latitude: number(form, "latitude"),
            longitude: number(form, "longitude"),
            roadName: text(form, "roadName"),
            locality: text(form, "locality"),
            clientName: text(form, "clientName"),
            contractorName: text(form, "contractorName"),
            contractorEmail: text(form, "contractorEmail"),
            contractorPhone: text(form, "contractorPhone"),
            contractorLicence: text(form, "contractorLicence"),
            plannedStartDate: text(form, "plannedStartDate"),
          },
        });
      }

      setSaved(
        "Saved. Process the affected item again to use this information.",
      );
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not save job information. Try again."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => void save(event, false)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The property address comes from this job. Supply confirmed details
          here; missing general form details may use clearly labeled demo data.
          Coordinates are used for air readings; road and locality are used for
          traffic checks.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {contextFields.map((field) => (
            <Field key={field.name}>
              <FieldLabel htmlFor={`context-${field.name}`}>
                {field.label}
              </FieldLabel>
              <Input
                id={`context-${field.name}`}
                name={field.name}
                type={field.type}
                step={field.type === "number" ? "any" : undefined}
                defaultValue={job.agentContext?.[field.name] ?? ""}
                disabled={saving}
              />
            </Field>
          ))}
        </div>
        <Button type="submit" disabled={saving}>
          Save job information
        </Button>
      </form>
      <form
        onSubmit={(event) => void save(event, true)}
        className="space-y-3 border-t pt-4"
      >
        <Field>
          <FieldLabel htmlFor="confirmed-year">
            Contractor-confirmed construction year
          </FieldLabel>
          <Input
            id="confirmed-year"
            name="year"
            type="number"
            min={1800}
            step={1}
            defaultValue={job.confirmedConstructionYear?.year ?? ""}
            disabled={saving}
          />
        </Field>
        <p className="text-sm text-muted-foreground">
          Used only after a successful DataVic lookup has no usable year. Leave
          blank to remove the saved year.
        </p>
        <Button type="submit" variant="outline" disabled={saving}>
          Save construction year
        </Button>
      </form>
      {saved && (
        <p role="status" className="text-sm">
          {saved}
        </p>
      )}
      {error && <RequestError message={error} />}
    </div>
  );
}

export function JobAgentControls({
  job,
  items,
  busy,
}: {
  job: Doc<"jobs">;
  items: Doc<"checklistItems">[];
  busy: boolean;
}) {
  const start = useMutation(api.checklistExecution.start);
  const [starting, setStarting] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingIds = items
    .filter((item) => item.status === "pending")
    .map((item) => item._id);

  async function process() {
    setStarting(true);
    setError(null);

    try {
      await start({ itemIds: pendingIds });
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not start the checklist. Try again."),
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={starting || busy || pendingIds.length === 0}
          onClick={() => void process()}
        >
          {starting
            ? "Starting..."
            : busy
              ? "Processing checklist..."
              : "Process pending items"}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-label="Job information"
              />
            }
          >
            Job information
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Information for checks and drafts</DialogTitle>
              <DialogDescription>
                Save confirmed information, then retry the affected item.
              </DialogDescription>
            </DialogHeader>
            {open && <JobContextFields job={job} />}
          </DialogContent>
        </Dialog>
      </div>
      {error && <RequestError message={error} />}
    </div>
  );
}
