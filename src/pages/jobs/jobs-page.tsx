import { usePaginatedQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
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
import { jobStatusLabels } from "@/pages/jobs/job-labels";

export function JobsPage() {
  const jobs = usePaginatedQuery(api.jobs.list, {}, { initialNumItems: 20 });

  return (
    <>
      <PageHeading
        title="Jobs"
        description="Track each site visit and its checklist."
        action={
          <Button nativeButton={false} render={<Link to="new" />}>
            Create job
          </Button>
        }
      />
      <Card>
        <CardContent>
          {jobs.status === "LoadingFirstPage" ? (
            <p className="text-sm text-muted-foreground">Loading jobs...</p>
          ) : jobs.results.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-medium">No jobs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a job from the information you have now.
              </p>
              <Button
                className="mt-4"
                nativeButton={false}
                render={<Link to="new" />}
              >
                Create job
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.results.map(({ job, categoryTitle }) => (
                  <TableRow key={job._id}>
                    <TableCell className="font-medium">
                      {job.addressText}
                    </TableCell>
                    <TableCell>{categoryTitle ?? "Uncategorized"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {jobStatusLabels[job.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link to={job._id} />}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {jobs.status === "CanLoadMore" && (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => jobs.loadMore(20)}
            >
              Load more
            </Button>
          )}
          {jobs.status === "LoadingMore" && (
            <p className="mt-4 text-sm text-muted-foreground">
              Loading more...
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
