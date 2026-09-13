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
import { JobStatusBadge } from "./components/job-status-badge";

export function JobsPage() {
  const jobs = usePaginatedQuery(api.jobs.list, {}, { initialNumItems: 20 });

  return (
    <>
      <PageHeading
        title="Jobs"
        action={
          <Button nativeButton={false} render={<Link to="new" />}>
            <PlusIcon />
            Create job
          </Button>
        }
      />
      <div className="border bg-card">
        {jobs.status === "LoadingFirstPage" ? (
          <p className="p-6 text-sm text-muted-foreground" role="status">
            Loading jobs...
          </p>
        ) : jobs.results.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-medium">No jobs yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">Open job</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.results.map(({ job, categoryTitle }) => (
                <TableRow key={job._id}>
                  <TableCell className="min-w-32 font-medium wrap-anywhere">
                    <Link
                      to={job._id}
                      className="hover:underline hover:underline-offset-4"
                    >
                      {job.addressText}
                    </Link>
                    <p className="mt-1 text-xs font-normal text-muted-foreground sm:hidden">
                      {categoryTitle ?? "Uncategorized"}
                    </p>
                  </TableCell>
                  <TableCell className="hidden wrap-anywhere sm:table-cell">
                    {categoryTitle ?? "Uncategorized"}
                  </TableCell>
                  <TableCell>
                    <JobStatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Open ${job.addressText}`}
                      nativeButton={false}
                      render={<Link to={job._id} />}
                    >
                      <ChevronRightIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {jobs.status === "CanLoadMore" && (
          <Button
            className="m-4"
            variant="outline"
            onClick={() => jobs.loadMore(20)}
          >
            Load more
          </Button>
        )}
        {jobs.status === "LoadingMore" && (
          <p className="p-4 text-sm text-muted-foreground" role="status">
            Loading more...
          </p>
        )}
      </div>
    </>
  );
}
