import type { Doc } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { checklistKindLabels } from "@/pages/jobs/job-labels";

const kindStyles = {
  automated: "bg-check-automated-muted text-check-automated",
  third_party: "bg-check-third-party-muted text-check-third-party",
  on_site: "bg-check-on-site-muted text-check-on-site",
};

export function ChecklistKindBadge({
  kind,
}: {
  kind: Doc<"checklistItems">["kind"];
}) {
  return (
    <Badge className={`w-24 justify-center ${kindStyles[kind]}`}>
      {checklistKindLabels[kind]}
    </Badge>
  );
}
