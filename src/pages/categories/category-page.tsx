import { Children, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { MoreHorizontalIcon, PencilIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryForm } from "./components/category-form";
import { TemplateCheckRow } from "./components/template-check-row";
import { TemplateSummary } from "./components/template-summary";

function CategoryDetails({
  category,
}: {
  category: NonNullable<FunctionReturnType<typeof api.categories.get>>;
}) {
  const updateCategory = useMutation(api.categories.update);
  const remove = useMutation(api.categories.remove);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  return (
    <>
      {!editing && (
        <PageHeading
          title={category.title}
          action={
            <>
              <Button onClick={() => setEditing(true)}>
                <PencilIcon />
                Edit category
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="More category actions"
                    />
                  }
                >
                  <MoreHorizontalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ConfirmDialog
                    trigger="Delete category"
                    triggerRender={
                      <DropdownMenuItem
                        closeOnClick={false}
                        variant="destructive"
                      />
                    }
                    title={`Delete ${category.title}?`}
                    description="Reassign jobs using this category before deleting it. Their checklists and progress will stay unchanged."
                    confirmLabel="Delete category"
                    onConfirm={async () => {
                      await remove({ categoryId: category._id });
                      void navigate("/app/categories", { replace: true });
                    }}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />
      )}
      {editing ? (
        <CategoryForm
          editing
          initialTitle={category.title}
          initialDescription={category.description}
          initialChecklist={category.checklist}
          documents={category.documents}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await updateCategory({ categoryId: category._id, ...values });
            setEditing(false);
          }}
        />
      ) : (
        <div className="max-w-4xl space-y-8">
          <p className="max-w-3xl text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere text-muted-foreground">
            {category.description ||
              "No description yet. Edit this category to describe the work it covers."}
          </p>
          <section aria-labelledby="template-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <h2 id="template-heading" className="font-semibold">
                Checklist template
              </h2>
              <TemplateSummary checklist={category.checklist} />
            </div>
            <p className="text-sm text-muted-foreground">
              New jobs in this category start with these checks.
            </p>
            {category.checklist.length === 0 ? (
              <p className="border-y py-8 text-sm text-muted-foreground">
                No checks yet. Edit this category to add its first check.
              </p>
            ) : (
              <ol className="divide-y border-y">
                {Children.toArray(
                  category.checklist.map((item, index) => (
                    <li>
                      <TemplateCheckRow
                        item={item}
                        number={index + 1}
                        documents={category.documents}
                      />
                    </li>
                  )),
                )}
              </ol>
            )}
          </section>
        </div>
      )}
    </>
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

  return <CategoryDetails key={category._id} category={category} />;
}
