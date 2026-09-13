import { usePaginatedQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        description="Manage private trade categories and checklist templates."
        action={
          <Button nativeButton={false} render={<Link to="new" />}>
            Create category
          </Button>
        }
      />
      <Card>
        <CardContent>
          {categories.status === "LoadingFirstPage" ? (
            <p className="text-sm text-muted-foreground">
              Loading categories...
            </p>
          ) : categories.results.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-medium">No categories yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create one before adding a job.
              </p>
              <Button
                className="mt-4"
                nativeButton={false}
                render={<Link to="new" />}
              >
                Create category
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.results.map((category) => (
                  <TableRow key={category._id}>
                    <TableCell className="font-medium">
                      {category.title}
                    </TableCell>
                    <TableCell>{category.checklist.length}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link to={category._id} />}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <p className="mt-4 text-sm text-muted-foreground">
              Loading more...
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
