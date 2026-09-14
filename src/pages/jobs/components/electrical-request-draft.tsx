import { useId, useState } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { RequestError } from "@/components/layout/request-error";

type Draft = NonNullable<Doc<"checklistAgentStates">["requestDraft"]>;

// Older saved drafts include these repeated labels in their values and email.
// Keep the source record intact; the review view uses one short notice instead.
function reviewText(value: string) {
  return value
    .replace(/\[DEMO DATA — replace or confirm before use\] /g, "")
    .replace(
      /^DRAFT FOR REVIEW — replace or confirm any DEMO DATA before sending\.\s*/,
      "",
    );
}

export function ElectricalRequestDraft({
  draft,
  current,
}: {
  draft: Draft;
  current: boolean;
}) {
  const id = useId();
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(reviewText(draft.body ?? ""));
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isEmail = draft.skillKey === "lei-booking";

  const hasExamples = draft.fields.some(
    (field) => field.method === "demo_data",
  );

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError(null);
    } catch {
      setError("Copy failed. Select the displayed text and copy it manually.");
    }
  }

  function renderField(field: Draft["fields"][number]) {
    const value = values[field.field] ?? reviewText(field.value ?? "");

    return (
      <Field key={field.field} className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor={`${id}-${field.field}`}>
            {field.label}
          </FieldLabel>
          <Button
            size="xs"
            variant="ghost"
            disabled={!value.trim()}
            aria-label={`Copy ${field.label}`}
            onClick={() => void copy(value, field.label)}
          >
            Copy
          </Button>
        </div>
        <Textarea
          id={`${id}-${field.field}`}
          className="min-h-10 max-h-48 text-sm"
          value={value}
          placeholder="Enter confirmed details"
          onChange={(event) => {
            setValues({ ...values, [field.field]: event.target.value });
            setCopied(null);
          }}
        />
      </Field>
    );
  }

  return (
    <section className="space-y-4" aria-label={draft.title}>
      {!current && (
        <p className="text-xs text-muted-foreground">
          Earlier draft. Regenerate using the current job details before use.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {hasExamples
          ? "Includes example details. Review before use. "
          : "Review before use. "}
        Nothing submitted.
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <a
          className="font-medium underline underline-offset-4"
          href={draft.destinationUrl}
          target="_blank"
          rel="noreferrer"
        >
          {isEmail ? "Find an inspector ↗" : "Open ESVConnect ↗"}
        </a>
      </div>
      {isEmail ? (
        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor={`${id}-subject`}>Subject</FieldLabel>
            <Input
              id={`${id}-subject`}
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setCopied(null);
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
            <Textarea
              id={`${id}-email`}
              className="h-64 min-h-48 resize-y text-sm leading-6 [field-sizing:fixed]"
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setCopied(null);
              }}
            />
          </Field>
          <Button
            size="sm"
            disabled={!body.trim()}
            onClick={() =>
              void copy(
                `Subject: ${subject}\n\n${hasExamples ? "Draft for review — includes example details.\n\n" : ""}${body}`,
                "Email draft",
              )
            }
          >
            Copy email
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {draft.fields
            .filter((field) => field.portalLabelVerified)
            .map(renderField)}
          <details>
            <summary className="cursor-pointer text-sm font-medium">
              Supporting information
            </summary>
            <div className="mt-3 space-y-4">
              <p className="text-xs text-muted-foreground">
                Reference details for review; these are not portal field labels.
              </p>
              {draft.fields
                .filter((field) => !field.portalLabelVerified)
                .map(renderField)}
            </div>
          </details>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Edit, then copy. Edits are not saved when you close this view.
      </p>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">How to use this draft</summary>
        <p className="mt-2 leading-5">{draft.guidance}</p>
        <a
          className="mt-2 inline-block underline"
          href={draft.guidanceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Official guidance ↗
        </a>
      </details>
      {copied && (
        <p role="status" className="text-xs">
          {copied} copied.
        </p>
      )}
      {error && <RequestError message={error} />}
    </section>
  );
}
