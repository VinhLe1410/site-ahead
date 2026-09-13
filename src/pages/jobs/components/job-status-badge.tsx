import type { Doc } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { jobStatusLabels } from "@/pages/jobs/job-labels";

const statusStyles = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-progress-muted text-progress",
  done: "bg-success-muted text-success",
};

export function JobStatusBadge({ status }: { status: Doc<"jobs">["status"] }) {
  return (
    <Badge className={statusStyles[status]}>{jobStatusLabels[status]}</Badge>
  );
}
