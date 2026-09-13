import { useState, type FormEvent } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequestError } from "@/components/layout/request-error";

export type ChecklistKind = "automated" | "third_party" | "on_site";

export type TemplateItem = { title: string; kind: ChecklistKind };

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
  editing = false,
  submitLabel,
  onSubmit,
}: {
  initialTitle?: string;
  initialChecklist?: TemplateItem[];
  editing?: boolean;
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
        checklist: checklist.map(({ title: itemTitle, kind }) => ({
          title: itemTitle,
          kind,
        })),
      });
      setIsSaving(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the category. Please try again.",
      );
      setIsSaving(false);
    }
  }

  return (
    <form
      className="max-w-4xl space-y-6"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="max-w-xl">
        <Field>
          <FieldLabel htmlFor="category-title">Category name</FieldLabel>
          <Input
            id="category-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSaving}
            required
          />
        </Field>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Checklist template</h2>
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
            No checklist items yet.
          </p>
        )}
        {checklist.length > 0 && (
          <div className="divide-y border bg-card">
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1fr)_11rem_2.5rem] gap-3 bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground sm:grid"
            >
              <span>Item</span>
              <span>Kind</span>
            </div>
            {checklist.map((item, index) => (
              <div
                key={item.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_11rem_auto]"
              >
                <Field className="col-span-2 min-w-0 sm:col-span-1">
                  <FieldLabel htmlFor={`item-${index}`} className="sm:sr-only">
                    Item {index + 1}
                  </FieldLabel>
                  <Input
                    id={`item-${index}`}
                    value={item.title}
                    onChange={(event) =>
                      updateItem(index, { ...item, title: event.target.value })
                    }
                    disabled={isSaving}
                    required
                  />
                </Field>
                <Field className="min-w-0">
                  <FieldLabel
                    htmlFor={`kind-${item.key}`}
                    className="sm:sr-only"
                  >
                    Kind
                  </FieldLabel>
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
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
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
            ))}
          </div>
        )}
      </div>
      {error !== null && <RequestError message={error} />}
      <div className="space-y-3 border-t pt-5">
        {editing && (
          <p className="text-sm text-muted-foreground">
            Template changes apply to future jobs. Existing checklists stay
            unchanged.
          </p>
        )}
        {checklist.length >= 100 && (
          <p className="text-sm" role="status">
            Limit reached: 100 items.
          </p>
        )}
        <Button type="submit" disabled={isSaving || title.trim().length === 0}>
          {isSaving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
