import { useRef, useState, type FormEvent } from "react";
import type { FunctionArgs } from "convex/server";
import type { api } from "../../../../convex/_generated/api";
import type { DocumentSummary } from "../../../../convex/documentData";
import { getErrorMessage } from "../../../../shared/errors";
import { MAX_CATEGORY_DESCRIPTION_LENGTH } from "../../../../shared/categories";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RequestError } from "@/components/layout/request-error";
import { PageHeading } from "@/components/layout/page-heading";
import { checklistKindLabels } from "@/pages/jobs/job-labels";
import { DocumentPicker } from "./document-picker";
import { TemplateCheckRow } from "./template-check-row";
import { TemplateSummary } from "./template-summary";

type CategoryValues = FunctionArgs<typeof api.categories.create>;

type TemplateRow = CategoryValues["checklist"][number] & { key: string };

export function CategoryForm({
  initialTitle = "",
  initialDescription = "",
  initialChecklist = [],
  documents = [],
  editing = false,
  heading = editing ? "Edit category" : "New category",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialTitle?: string;
  initialDescription?: string;
  initialChecklist?: CategoryValues["checklist"];
  documents?: DocumentSummary[];
  editing?: boolean;
  heading?: string;
  submitLabel: string;
  onSubmit: (values: CategoryValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  const [checklist, setChecklist] = useState<TemplateRow[]>(() =>
    initialChecklist.map((item) => ({ ...item, key: crypto.randomUUID() })),
  );

  const [addedDocuments, setAddedDocuments] = useState<DocumentSummary[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInput = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const activeItem = checklist.find((item) => item.key === activeKey);
  const knownDocuments = [...documents, ...addedDocuments];

  const template = checklist.map(({ key: _key, ...item }) => item);

  const dirty =
    title !== initialTitle ||
    description !== initialDescription ||
    JSON.stringify(template) !== JSON.stringify(initialChecklist);

  function updateItem(next: TemplateRow) {
    setChecklist((items) =>
      items.map((item) => (item.key === next.key ? next : item)),
    );
  }

  function addItem() {
    const item: TemplateRow = {
      key: crypto.randomUUID(),
      title: "",
      kind: "on_site",
    };

    setChecklist((items) => [...items, item]);
    returnFocus.current = addButton.current;
    setActiveKey(item.key);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const invalidItem = checklist.find(
      (item) => item.title.trim().length === 0,
    );

    if (invalidItem !== undefined) {
      setError("Give every check a title before saving.");
      returnFocus.current = addButton.current;
      setActiveKey(invalidItem.key);

      return;
    }

    setIsSaving(true);

    try {
      await onSubmit({ title, description, checklist: template });
    } catch (caught) {
      setError(
        getErrorMessage(
          caught,
          "Could not save the category. Please try again.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="max-w-4xl space-y-8"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="sticky top-0 z-10 -mx-1 border-b bg-background/95 px-1 py-3 backdrop-blur-sm [&>div]:mb-0">
        <PageHeading
          title={heading}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <p role="status" className="text-sm text-muted-foreground">
                {isSaving
                  ? "Saving changes..."
                  : dirty
                    ? "Unsaved changes"
                    : editing
                      ? "No unsaved changes"
                      : "Not saved"}
              </p>
              <div className="flex gap-2">
                {onCancel !== undefined && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={
                    isSaving || title.trim().length === 0 || (editing && !dirty)
                  }
                >
                  {isSaving ? "Saving..." : submitLabel}
                </Button>
              </div>
            </div>
          }
        />
      </div>
      {error !== null && <RequestError message={error} />}
      <div className="space-y-5">
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
        <Field>
          <FieldLabel htmlFor="category-description">Description</FieldLabel>
          <Textarea
            id="category-description"
            className="min-h-28"
            aria-describedby="category-description-help"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={MAX_CATEGORY_DESCRIPTION_LENGTH}
            disabled={isSaving}
          />
          <FieldDescription id="category-description-help">
            Optional. Describe the work this category covers, with examples and
            exclusions. Intake uses this to match jobs. Limit:{" "}
            {MAX_CATEGORY_DESCRIPTION_LENGTH.toLocaleString("en-AU")}{" "}
            characters.
          </FieldDescription>
        </Field>
      </div>
      <section aria-labelledby="template-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="template-heading" className="font-semibold">
              Checklist template
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <TemplateSummary checklist={template} />
            <Button
              ref={addButton}
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={isSaving || checklist.length >= 100}
            >
              <PlusIcon />
              Add check
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {editing
            ? "Template changes apply to future jobs. Existing checklists stay unchanged."
            : "New jobs in this category start with these checks."}
        </p>
        {checklist.length === 0 ? (
          <p className="border-y py-8 text-sm text-muted-foreground">
            No checks yet. Add a check to start the template.
          </p>
        ) : (
          <ol className="divide-y border-y">
            {checklist.map((item, index) => (
              <li key={item.key} className="flex items-start gap-3">
                <TemplateCheckRow
                  item={item}
                  number={index + 1}
                  documents={knownDocuments}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 shrink-0"
                  disabled={isSaving}
                  aria-label={`Edit check ${index + 1}`}
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget;
                    setActiveKey(item.key);
                  }}
                >
                  <PencilIcon />
                  Edit
                </Button>
              </li>
            ))}
          </ol>
        )}
        {checklist.length >= 100 && (
          <p className="text-sm" role="status">
            Limit reached: 100 checks.
          </p>
        )}
      </section>
      <Dialog
        open={activeItem !== undefined}
        onOpenChange={(open) => {
          if (!open) setActiveKey(null);
        }}
      >
        <DialogContent
          className="gap-6 sm:max-w-xl"
          initialFocus={() => titleInput.current ?? true}
          finalFocus={() => returnFocus.current ?? addButton.current ?? true}
        >
          <DialogHeader>
            <DialogTitle>Edit check</DialogTitle>
            <DialogDescription>
              Changes stay in your category draft. Save the category to apply
              them.
            </DialogDescription>
          </DialogHeader>
          {activeItem !== undefined && (
            <div className="space-y-6">
              <Field>
                <FieldLabel htmlFor="check-title">Check title</FieldLabel>
                <Textarea
                  ref={titleInput}
                  id="check-title"
                  className="min-h-28"
                  value={activeItem.title}
                  onChange={(event) =>
                    updateItem({ ...activeItem, title: event.target.value })
                  }
                  disabled={isSaving}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="check-kind">Kind</FieldLabel>
                <Select
                  value={activeItem.kind}
                  onValueChange={(kind) => {
                    if (kind !== null) updateItem({ ...activeItem, kind });
                  }}
                  disabled={isSaving}
                >
                  <SelectTrigger id="check-kind" className="w-full">
                    <SelectValue>
                      {checklistKindLabels[activeItem.kind]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(checklistKindLabels).map(
                      ([kind, label]) => (
                        <SelectItem key={kind} value={kind}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <DocumentPicker
                selectedIds={activeItem.documentIds ?? []}
                savedDocuments={knownDocuments}
                disabled={isSaving}
                onDocumentAdded={(document) =>
                  setAddedDocuments((current) => [
                    ...current.filter(
                      (entry) => entry.document._id !== document.document._id,
                    ),
                    document,
                  ])
                }
                onChange={(documentIds) =>
                  updateItem({ ...activeItem, documentIds })
                }
              />
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveKey(null)}
            >
              Back to category
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={isSaving}
              onClick={() => {
                setChecklist((items) =>
                  items.filter((item) => item.key !== activeKey),
                );
                returnFocus.current = addButton.current;
                setActiveKey(null);
              }}
            >
              <Trash2Icon />
              Remove check
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
