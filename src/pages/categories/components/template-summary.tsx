import type { Doc } from "../../../../convex/_generated/dataModel";
import { checklistKindLabels } from "@/pages/jobs/job-labels";

export function TemplateSummary({
  checklist,
}: {
  checklist: Doc<"categories">["checklist"];
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        {checklist.length} {checklist.length === 1 ? "check" : "checks"}
      </span>
      {Object.entries(checklistKindLabels).map(([kind, label]) => {
        const count = checklist.filter((item) => item.kind === kind).length;

        return count > 0 ? (
          <span key={kind}>
            {count} {label.toLowerCase()}
          </span>
        ) : null;
      })}
    </div>
  );
}
