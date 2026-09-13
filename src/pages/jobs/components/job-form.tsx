import { getErrorMessage } from "../../../../shared/errors";
import { useState, type FormEvent } from "react";
import { usePaginatedQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router";

export function JobForm({
  initialValues = { processedText: "", addressText: "", categoryId: null },
  initialCategoryTitle = null,
  editing = false,
  onSubmit,
}: {
  initialValues?: FunctionArgs<typeof api.jobs.create>;
  initialCategoryTitle?: string | null;
  editing?: boolean;
  onSubmit: (values: FunctionArgs<typeof api.jobs.create>) => Promise<void>;
}) {
  const categories = usePaginatedQuery(
    api.categories.list,
    {},
    { initialNumItems: 20 },
  );

  const [processedText, setProcessedText] = useState(
    initialValues.processedText,
  );

  const [addressText, setAddressText] = useState(initialValues.addressText);

  const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(
    initialValues.categoryId,
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError(null);
    setIsSaving(true);

    try {
      await onSubmit({ processedText, addressText, categoryId });
      setIsSaving(false);
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not save the job. Please try again."),
      );
      setIsSaving(false);
    }
  }

  const isLoading = categories.status === "LoadingFirstPage";

  const selectedCategory = categories.results.find(
    (category) => category._id === categoryId,
  );

  const initialCategorySelected =
    categoryId === initialValues.categoryId && initialCategoryTitle !== null;

  const categoryAvailable =
    categoryId === null ||
    selectedCategory !== undefined ||
    initialCategorySelected;

  const categoryTitle =
    categoryId === null
      ? "Uncategorized"
      : (selectedCategory?.title ??
        (initialCategorySelected
          ? initialCategoryTitle
          : "Selected category is unavailable"));

  return (
    <>
      <form
        className="space-y-6"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <Card>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="processed-text">Processed text</FieldLabel>
                <Textarea
                  id="processed-text"
                  value={processedText}
                  onChange={(event) => setProcessedText(event.target.value)}
                  disabled={isSaving}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Input
                  id="address"
                  value={addressText}
                  onChange={(event) => setAddressText(event.target.value)}
                  disabled={isSaving}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="job-category">Category</FieldLabel>
                <FieldDescription>
                  {editing
                    ? "Changing or clearing the category keeps this job’s existing checklist, status, and notes."
                    : "Optional. Uncategorized jobs start without checklist items."}
                </FieldDescription>
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={isSaving || isLoading}
                >
                  <SelectTrigger id="job-category" className="w-full">
                    <SelectValue
                      placeholder={
                        isLoading ? "Loading categories..." : "Uncategorized"
                      }
                    >
                      {categoryTitle}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.results.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!categoryAvailable && (
                  <p role="alert" className="text-sm text-destructive">
                    This category was removed. Select another category or clear
                    it. Your draft has not changed.
                  </p>
                )}
                {categoryId !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCategoryId(null)}
                    disabled={isSaving}
                  >
                    Clear category
                  </Button>
                )}
                {categories.status === "CanLoadMore" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => categories.loadMore(20)}
                  >
                    Load more categories
                  </Button>
                )}
                {categories.status === "LoadingMore" && (
                  <p className="text-sm text-muted-foreground">
                    Loading more categories...
                  </p>
                )}
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        {error !== null && <RequestError message={error} />}
        {error !== null && !editing && categoryId !== null && (
          <p className="text-sm">
            <Link
              to={`/app/categories/${categoryId}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Open category template to fix document references
            </Link>
          </p>
        )}
        <Button
          type="submit"
          disabled={
            isSaving ||
            !categoryAvailable ||
            processedText.trim().length === 0 ||
            addressText.trim().length === 0
          }
        >
          {isSaving ? "Saving..." : editing ? "Save changes" : "Create job"}
        </Button>
      </form>
    </>
  );
}
