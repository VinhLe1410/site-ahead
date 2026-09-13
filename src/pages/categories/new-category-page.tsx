import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { CategoryForm } from "@/pages/categories/components/category-form";

export function NewCategoryPage() {
  const createCategory = useMutation(api.categories.create);
  const navigate = useNavigate();

  return (
    <CategoryForm
      submitLabel="Create category"
      onSubmit={async (values) => {
        const categoryId = await createCategory(values);
        void navigate(`/app/categories/${categoryId}`);
      }}
    />
  );
}
