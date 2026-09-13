import { useState, type FormEvent } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeading } from "@/components/layout/page-heading";
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

function selectedCategoryTitle(
  categories: Array<{ _id: Id<"categories">; title: string }>,
  categoryId: Id<"categories"> | null,
) {
  if (categoryId === null) {
    return "Uncategorized";
  }

  const category = categories.find((item) => item._id === categoryId);

  if (category === undefined) {
    throw new Error("Selected category is not loaded");
  }

  return category.title;
}

export function NewJobPage() {
  const categories = usePaginatedQuery(
    api.categories.list,
    {},
    { initialNumItems: 20 },
  );

  const createJob = useMutation(api.jobs.create);
  const navigate = useNavigate();
  const [processedText, setProcessedText] = useState("");
  const [addressText, setAddressText] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError(null);
    setIsSaving(true);

    try {
      const jobId = await createJob({ processedText, addressText, categoryId });
      void navigate(`/app/jobs/${jobId}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not create the job. Please try again.",
      );
      setIsSaving(false);
    }
  }

  const isLoading = categories.status === "LoadingFirstPage";

  return (
    <>
      <PageHeading
        title="New job"
        description="Save manual intake now. Add a category when the work is classified."
      />
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
                  Optional. Uncategorized jobs start without checklist items.
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
                      {selectedCategoryTitle(categories.results, categoryId)}
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
        <Button
          type="submit"
          disabled={
            isSaving ||
            processedText.trim().length === 0 ||
            addressText.trim().length === 0
          }
        >
          {isSaving ? "Creating..." : "Create job"}
        </Button>
      </form>
    </>
  );
}
