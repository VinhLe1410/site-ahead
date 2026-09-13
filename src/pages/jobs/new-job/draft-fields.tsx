import { usePaginatedQuery, useQuery } from "convex/react";
import { MapPin } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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

export type DraftValues = Pick<
  Doc<"jobDrafts">,
  "processedText" | "addressText" | "categoryId"
>;

export function DraftFields({
  values,
  disabled,
  onChange,
}: {
  values: DraftValues;
  disabled: boolean;
  onChange: (values: DraftValues) => void;
}) {
  const categories = usePaginatedQuery(
    api.categories.list,
    {},
    { initialNumItems: 20 },
  );

  const selectedCategory = useQuery(
    api.categories.get,
    values.categoryId === null ? "skip" : { categoryId: values.categoryId },
  );

  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel htmlFor="draft-brief">Job brief</FieldLabel>
        <Textarea
          id="draft-brief"
          className="min-h-36 resize-y bg-card text-sm leading-6"
          placeholder="What work is needed? Include access, dimensions and anything the crew should know."
          value={values.processedText}
          onChange={(event) =>
            onChange({ ...values, processedText: event.target.value })
          }
          disabled={disabled}
          maxLength={12000}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="draft-address">Site address</FieldLabel>
        <div className="relative">
          <MapPin className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
          <Input
            id="draft-address"
            className="h-10 bg-card pl-9"
            placeholder="Street address, suburb and postcode"
            value={values.addressText}
            onChange={(event) =>
              onChange({ ...values, addressText: event.target.value })
            }
            disabled={disabled}
            maxLength={500}
            required
          />
        </div>
      </Field>
      <Field>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="draft-category">Category</FieldLabel>
          {values.categoryId !== null && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={disabled}
              onClick={() => onChange({ ...values, categoryId: null })}
            >
              Clear category
            </Button>
          )}
        </div>
        <Select
          value={values.categoryId}
          onValueChange={(categoryId) => onChange({ ...values, categoryId })}
          disabled={disabled || categories.status === "LoadingFirstPage"}
        >
          <SelectTrigger id="draft-category" className="h-10 w-full bg-card">
            <SelectValue>
              {values.categoryId === null
                ? "Uncategorized"
                : selectedCategory === undefined
                  ? "Loading category…"
                  : selectedCategory === null
                    ? "Category unavailable"
                    : selectedCategory.title}
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
        <FieldDescription>
          {values.categoryId === null
            ? "Choose a category for checks, or leave uncategorized."
            : "This category supplies the starting checklist."}
        </FieldDescription>
        {values.categoryId !== null && selectedCategory === null && (
          <p role="alert" className="text-sm text-destructive">
            This category was removed. Choose another or clear it.
          </p>
        )}
        {categories.status === "CanLoadMore" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => categories.loadMore(20)}
          >
            Load more categories
          </Button>
        )}
        {categories.status === "LoadingMore" && (
          <p role="status" className="text-xs text-muted-foreground">
            Loading categories…
          </p>
        )}
      </Field>
    </FieldGroup>
  );
}
