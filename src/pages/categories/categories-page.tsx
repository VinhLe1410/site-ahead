import { usePaginatedQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { TemplateSummary } from "./components/template-summary";

export function CategoriesPage() {
  const categories = usePaginatedQuery(
    api.categories.list,
    {},
    { initialNumItems: 20 },
  );

  return (
    <>
      <PageHeading
        title="Categories"
        action={
          <Button nativeButton={false} render={<Link to="new" />}>
            <PlusIcon />
            Create category
          </Button>
        }
      />
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Define the work your team takes on and the checks each job starts with.
      </p>
      {categories.status === "LoadingFirstPage" ? (
        <p className="py-6 text-sm text-muted-foreground" role="status">
          Loading categories...
        </p>
      ) : categories.results.length === 0 ? (
        <div className="border-y py-10">
          <p className="font-medium">No categories yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a category to describe a trade and set up its checklist.
          </p>
        </div>
      ) : (
        <ul className="divide-y border-y">
          {categories.results.map((category) => (
            <li key={category._id}>
              <Link
                to={category._id}
                className="group flex items-center gap-6 px-2 py-6 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="min-w-0 flex-1 space-y-3">
                  <h2 className="text-base font-semibold wrap-anywhere group-hover:underline group-hover:underline-offset-4">
                    {category.title}
                  </h2>
                  {category.description && (
                    <p className="max-w-3xl text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                  <TemplateSummary checklist={category.checklist} />
                </div>
                <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {categories.status === "CanLoadMore" && (
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => categories.loadMore(20)}
        >
          Load more
        </Button>
      )}
      {categories.status === "LoadingMore" && (
        <p className="py-4 text-sm text-muted-foreground" role="status">
          Loading more...
        </p>
      )}
    </>
  );
}
