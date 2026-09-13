import { usePaginatedQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <div className="border bg-card">
        {categories.status === "LoadingFirstPage" ? (
          <p className="p-6 text-sm text-muted-foreground" role="status">
            Loading categories...
          </p>
        ) : categories.results.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-medium">No categories yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">Open category</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.results.map((category) => (
                <TableRow key={category._id}>
                  <TableCell className="font-medium wrap-anywhere">
                    <Link
                      to={category._id}
                      className="hover:underline hover:underline-offset-4"
                    >
                      {category.title}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {category.checklist.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Open ${category.title}`}
                      nativeButton={false}
                      render={<Link to={category._id} />}
                    >
                      <ChevronRightIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {categories.status === "CanLoadMore" && (
          <Button
            className="m-4"
            variant="outline"
            onClick={() => categories.loadMore(20)}
          >
            Load more
          </Button>
        )}
        {categories.status === "LoadingMore" && (
          <p className="p-4 text-sm text-muted-foreground" role="status">
            Loading more...
          </p>
        )}
      </div>
    </>
  );
}
