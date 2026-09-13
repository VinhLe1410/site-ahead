import { useMutation, useQuery } from "convex/react";
import { useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { PageHeading } from "@/components/layout/page-heading";
import { CategoryForm } from "@/pages/categories/components/category-form";

function CategoryEditor({ category }: { category: Doc<"categories"> }) {
  const updateCategory = useMutation(api.categories.update);

  return (
    <CategoryForm
      initialTitle={category.title}
      initialChecklist={category.checklist}
      submitLabel="Save changes"
      onSubmit={async (values) => {
        await updateCategory({ categoryId: category._id, ...values });
      }}
    />
  );
}

export function CategoryPage() {
  const { categoryId } = useParams();

  const category = useQuery(api.categories.get, {
    categoryId: categoryId ?? "",
  });

  if (category === undefined)
    return <p className="text-sm text-muted-foreground">Loading category...</p>;

  if (category === null)
    return (
      <>
        <PageHeading title="Category not found" />
        <p className="text-sm text-muted-foreground">
          This category does not exist or you cannot access it.
        </p>
      </>
    );

  return (
    <>
      <PageHeading
        title={category.title}
        description="Changes apply only to jobs created after you save."
      />
      <CategoryEditor key={category._id} category={category} />
    </>
  );
}
