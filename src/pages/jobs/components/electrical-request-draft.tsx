import { useState } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { RequestError } from "@/components/layout/request-error";
import { Badge } from "@/components/ui/badge";

type Draft = NonNullable<Doc<"checklistAgentStates">["requestDraft"]>;

export function ElectricalRequestDraft({
  draft,
  current,
}: {
  draft: Draft;
  current: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setError(null);
    } catch {
      setError("Copy failed. Select the displayed text and copy it manually.");
    }
  }

  return (
    <section
      className="space-y-3 rounded-md border p-3"
      aria-label={draft.title}
    >
      <p className="font-medium">{draft.title}</p>
      {!current && (
        <p className="text-xs text-muted-foreground">
          Earlier saved draft. Review the current job information and regenerate
          before use.
        </p>
      )}
      <p className="text-xs text-muted-foreground">{draft.guidance}</p>
      {draft.fields.some((field) => field.method === "demo_data") && (
        <p className="text-sm">
          General values marked DEMO are fictional examples or proposals.
          Replace or confirm them before use; copying preserves their labels.
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-sm">
        <a
          className="underline"
          href={draft.destinationUrl}
          target="_blank"
          rel="noreferrer"
        >
          {draft.skillKey === "coes-portal"
            ? "Open ESVConnect"
            : "Choose an inspector in ESV’s register"}
        </a>
        <a
          className="underline"
          href={draft.guidanceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Official guidance
        </a>
      </div>
      {draft.body && (
        <div className="space-y-2">
          <p className="font-medium">Subject: {draft.subject}</p>
          <p className="whitespace-pre-wrap wrap-anywhere">{draft.body}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void copy(
                `Subject: ${draft.subject}\n\n${draft.body}`,
                "Email draft",
              )
            }
          >
            Copy email draft
          </Button>
        </div>
      )}
      <dl className="space-y-3">
        {draft.fields.map((field) => (
          <div key={field.field} className="space-y-1 border-t pt-2">
            <dt className="font-medium">
              {field.label}
              {field.method === "demo_data" && (
                <Badge variant="secondary" className="ml-2">
                  Demo data
                </Badge>
              )}
              {field.method === "database" && (
                <Badge variant="outline" className="ml-2">
                  {field.field === "description_of_work"
                    ? "Draft from saved scope"
                    : "Saved information"}
                </Badge>
              )}
              {draft.skillKey === "coes-portal" && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {field.portalLabelVerified
                    ? "Portal label from ESV guidance"
                    : "Reference information"}
                </span>
              )}
            </dt>
            <dd className="whitespace-pre-wrap wrap-anywhere">
              {field.value ?? "Missing — human confirmation required"}
            </dd>
            {field.value !== null && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Copy ${field.label}`}
                onClick={() => void copy(field.value ?? "", field.label)}
              >
                Copy value
              </Button>
            )}
          </div>
        ))}
      </dl>
      {copied && (
        <p role="status" className="text-xs">
          {copied} copied.
        </p>
      )}
      {error && <RequestError message={error} />}
    </section>
  );
}
