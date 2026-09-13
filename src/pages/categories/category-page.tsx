import { useMutation, useQuery } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeading } from "@/components/layout/page-heading";
import { CategoryForm } from "@/pages/categories/components/category-form";

function CategoryEditor({
  category,
}: {
  category: NonNullable<FunctionReturnType<typeof api.categories.get>>;
}) {
  const updateCategory = useMutation(api.categories.update);

  return (
    <CategoryForm
      editing
      initialTitle={category.title}
      initialChecklist={category.checklist}
      documents={category.documents}
      submitLabel="Save changes"
      onSubmit={async (values) => {
        await updateCategory({ categoryId: category._id, ...values });
      }}
    />
  );
}

export function CategoryPage() {
  const { categoryId } = useParams();
  const remove = useMutation(api.categories.remove);
  const navigate = useNavigate();

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
        action={
          <ConfirmDialog
            trigger="Delete category"
            title={`Delete ${category.title}?`}
            description="Reassign jobs using this category before deleting it. Their checklists and progress will stay unchanged."
            confirmLabel="Delete category"
            onConfirm={async () => {
              await remove({ categoryId: category._id });
              void navigate("/app/categories", { replace: true });
            }}
          />
        }
      />
      <CategoryEditor key={category._id} category={category} />
    </>
  );
}
