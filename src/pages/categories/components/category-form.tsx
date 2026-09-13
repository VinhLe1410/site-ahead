import { getErrorMessage } from "../../../../shared/errors";
import { useState, type FormEvent } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequestError } from "@/components/layout/request-error";
import type { Infer } from "convex/values";
import type { templateItemValidator } from "../../../../convex/contracts";
import type { DocumentSummary } from "../../../../convex/documentData";
import { DocumentPicker } from "./document-picker";

export type ChecklistKind = TemplateItem["kind"];

export type TemplateItem = Infer<typeof templateItemValidator>;

type TemplateRow = TemplateItem & { key: string };

const kindOptions: Array<{ value: ChecklistKind; label: string }> = [
  { value: "automated", label: "Automated" },
  { value: "third_party", label: "Third party" },
  { value: "on_site", label: "On site" },
];

const kindLabels: Record<ChecklistKind, string> = {
  automated: "Automated",
  third_party: "Third party",
  on_site: "On site",
};

export function CategoryForm({
  initialTitle = "",
  initialChecklist = [],
  documents = [],
  submitLabel,
  onSubmit,
}: {
  initialTitle?: string;
  initialChecklist?: TemplateItem[];
  documents?: DocumentSummary[];
  submitLabel: string;
  onSubmit: (values: {
    title: string;
    checklist: TemplateItem[];
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);

  const [checklist, setChecklist] = useState<TemplateRow[]>(() =>
    initialChecklist.map((item) => ({ ...item, key: crypto.randomUUID() })),
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, next: TemplateRow) {
    setChecklist((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? next : item)),
    );
  }

  function updateKind(
    index: number,
    item: TemplateRow,
    kind: ChecklistKind | null,
  ) {
    if (kind !== null) {
      updateItem(index, { ...item, kind });
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await onSubmit({
        title,
        checklist: checklist.map(({ key: _key, ...item }) => item),
      });
      setIsSaving(false);
    } catch (caught) {
      setError(
        getErrorMessage(
          caught,
          "Could not save the category. Please try again.",
        ),
      );
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
      <Card>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="category-title">Category title</FieldLabel>
            <Input
              id="category-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving}
              required
            />
          </Field>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Checklist template</h2>
            <p className="text-sm text-muted-foreground">
              Add up to 100 checks. New jobs receive their own copy.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setChecklist((items) => [
                ...items,
                { key: crypto.randomUUID(), title: "", kind: "on_site" },
              ])
            }
            disabled={isSaving || checklist.length >= 100}
          >
            <PlusIcon />
            Add item
          </Button>
        </div>
        {checklist.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            This category has no checklist items yet.
          </p>
        )}
        <FieldGroup>
          {checklist.map((item, index) => (
            <Card key={item.key} size="sm">
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`item-${index}`}>
                      Item {index + 1} title
                    </FieldLabel>
                    <Input
                      id={`item-${index}`}
                      value={item.title}
                      onChange={(event) =>
                        updateItem(index, {
                          ...item,
                          title: event.target.value,
                        })
                      }
                      disabled={isSaving}
                      required
                    />
                  </Field>
                  <Field className="sm:w-44">
                    <FieldLabel htmlFor={`kind-${item.key}`}>Kind</FieldLabel>
                    <Select
                      value={item.kind}
                      onValueChange={(kind) => updateKind(index, item, kind)}
                      disabled={isSaving}
                    >
                      <SelectTrigger id={`kind-${item.key}`} className="w-full">
                        <SelectValue>{kindLabels[item.kind]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {kindOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() =>
                      setChecklist((items) =>
                        items.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    disabled={isSaving}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <DocumentPicker
                  selectedIds={item.documentIds ?? []}
                  savedDocuments={documents}
                  disabled={isSaving}
                  onChange={(documentIds) =>
                    updateItem(index, { ...item, documentIds })
                  }
                />
              </CardContent>
            </Card>
          ))}
        </FieldGroup>
      </div>
      {error !== null && <RequestError message={error} />}
      <FieldError>
        {title.trim().length === 0 ? "Enter a category title." : null}
      </FieldError>
      <Button type="submit" disabled={isSaving || title.trim().length === 0}>
        {isSaving ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
