import type { Doc } from "../../../../convex/_generated/dataModel";

type RoadFinding = Extract<
  NonNullable<Doc<"checklistAgentStates">["finding"]>,
  { kind: "road_closures" }
>;

function sourceDate(value: string | number) {
  if (value === "") return "Not published";
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function RoadRecord({ record }: { record: RoadFinding["records"][number] }) {
  return (
    <li className="space-y-2 rounded-md border p-3">
      <p className="font-medium">
        {record.roadName} · {record.locality}
      </p>
      <dl className="grid gap-x-5 gap-y-1 text-xs sm:grid-cols-2">
        <div>
          <dt className="inline text-muted-foreground">Event: </dt>
          <dd className="inline">{record.eventType}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Impact: </dt>
          <dd className="inline">{record.impactType}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Published status: </dt>
          <dd className="inline">{record.status}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Starts: </dt>
          <dd className="inline">{sourceDate(record.start)}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Ends: </dt>
          <dd className="inline">{sourceDate(record.end)}</dd>
        </div>
      </dl>
      {record.description && (
        <p className="whitespace-pre-wrap wrap-anywhere">
          {record.description}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Source: {record.source} · Updated {sourceDate(record.updatedAt)}
      </p>
    </li>
  );
}

export function RoadFindingDetails({ finding }: { finding: RoadFinding }) {
  const visible = finding.records.slice(0, 3);
  const remaining = finding.records.slice(3);

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-muted-foreground">
        Matching road: {finding.roadName}, {finding.locality}. Published
        disruptions can include lane restrictions; a match does not necessarily
        mean the whole road is closed. This snapshot does not establish that
        your route is clear.
      </p>
      {visible.length > 0 ? (
        <ul className="space-y-2">
          {visible.map((record) => (
            <RoadRecord key={record.id} record={record} />
          ))}
        </ul>
      ) : (
        <p>No matching disruptions in this saved snapshot.</p>
      )}
      {remaining.length > 0 && (
        <details>
          <summary className="cursor-pointer font-medium">
            Show {remaining.length} more matching disruptions
          </summary>
          <ul className="mt-2 space-y-2">
            {remaining.map((record) => (
              <RoadRecord key={record.id} record={record} />
            ))}
          </ul>
        </details>
      )}
      <p className="text-xs text-muted-foreground">
        Snapshot updated {sourceDate(finding.observedAt)} · Retrieved{" "}
        {sourceDate(finding.fetchedAt)}
      </p>
    </div>
  );
}
