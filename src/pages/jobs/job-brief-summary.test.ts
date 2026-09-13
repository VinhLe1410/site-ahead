import { expect, test } from "vitest";
import type { Doc, Id, TableNames } from "../../../convex/_generated/dataModel";
import {
  executionSnapshot,
  type SnapshotContext,
} from "../../../shared/item-agent-snapshots";
import { summarizeJobBrief } from "./job-brief-summary";

function id<Table extends TableNames | "_storage">(value: string): Id<Table> {
  // SAFETY: These inert presentation fixtures never call Convex or persist IDs.
  return value as Id<Table>;
}

const context: Omit<SnapshotContext, "item"> = {
  job: {
    _id: id<"jobs">("job"),
    _creationTime: 1,
    organizationId: id<"organizations">("org"),
    inputId: id<"inputs">("input"),
    addressText: "123 Collins Street, Melbourne VIC 3000",
    status: "pending",
  },
  input: {
    _id: id<"inputs">("input"),
    _creationTime: 1,
    organizationId: id<"organizations">("org"),
    addressText: "123 Collins Street, Melbourne VIC 3000",
    processedText: "Renovation",
  },
  category: null,
};

function item(
  title: string,
  kind: Doc<"checklistItems">["kind"],
  status: Doc<"checklistItems">["status"] = "pending",
): Doc<"checklistItems"> {
  return {
    _id: id<"checklistItems">(title),
    _creationTime: 1,
    jobId: context.job._id,
    title,
    kind,
    status,
    notes: "",
  };
}

function state(
  forItem: Doc<"checklistItems">,
  fields: Partial<Doc<"checklistAgentStates">> = {},
): Doc<"checklistAgentStates"> {
  return {
    _id: id<"checklistAgentStates">(`state-${forItem._id}`),
    _creationTime: 1,
    itemId: forItem._id,
    jobId: context.job._id,
    classification: { status: "succeeded" },
    execution: "finished",
    currentStep: "finished",
    updatedAt: 2,
    provenance: [],
    missingInformation: [],
    nextAction: "",
    snapshot: executionSnapshot({
      ...context,
      item: { ...forItem, status: "pending" },
    }),
    ...fields,
  };
}

const year: NonNullable<Doc<"checklistAgentStates">["finding"]> = {
  kind: "construction_year",
  summary: "Saved year",
  observedAt: 1,
  address: context.job.addressText,
  constructionYear: 1940,
  pre1990: true,
  resolution: "live_api",
  lookupOutcome: "exact_match",
  coverage: "DataVic coverage",
};

const draft: NonNullable<Doc<"checklistAgentStates">["draft"]> = {
  storageId: id<"_storage">("draft"),
  sourceVersionId: id<"documentVersions">("source"),
  formKey: "building-permit-request",
  filename: "DEMO.pdf",
  contentType: "application/pdf",
  size: 100,
  savedAt: 2,
};

const roads: NonNullable<Doc<"checklistAgentStates">["finding"]> = {
  kind: "road_closures",
  summary: "Roads",
  observedAt: 1,
  fetchedAt: 2,
  scope: "exact_road_and_locality",
  roadName: "Collins Street",
  locality: "Melbourne",
  completeSnapshot: true,
  matchCount: 15,
  records: [],
  maxSnapshotAgeHours: 48,
  coverage: "Exact road only",
};

test("empty checklist has no invented completion or action", () => {
  expect(summarizeJobBrief(context, [], [])).toEqual({
    completed: [],
    drafts: [],
    actions: [],
    processing: 0,
    pending: 0,
  });
});

test("separates findings, manual completion and unsigned drafts; human asbestos assessment comes first", () => {
  const construction = item("Construction year", "automated", "done");
  const manual = item("Site photos", "on_site", "done");
  const permit = item("Building permit", "third_party");
  const asbestos = item("Asbestos assessment", "on_site");
  const air = item("Air Quality", "automated");

  const result = summarizeJobBrief(
    context,
    [construction, manual, permit, air, asbestos],
    [
      state(construction, { finding: year }),
      state(permit, { execution: "waiting", draft }),
      state(air, {
        execution: "waiting",
        missingInformation: [
          {
            field: "coordinates",
            label: "Site coordinates",
            reason: "Required",
          },
        ],
      }),
    ],
  );

  expect(result.completed).toHaveLength(2);
  expect(result.completed[0].detail).toContain("1940");
  expect(result.completed[1].detail).toContain("Marked done on the checklist");
  expect(result.drafts).toHaveLength(1);
  expect(result.drafts[0].detail).toContain(
    "nothing has been sent or approved",
  );
  expect(result.pending).toBe(3);
  expect(result.actions.map((action) => action.itemId)).toEqual([
    asbestos._id,
    air._id,
    permit._id,
  ]);
  expect(result.actions[1].detail).toContain("Site coordinates");
});

test("running, queued, classification failure and failed retries do not reuse prior output", () => {
  const active = item("Active year", "automated");
  const queued = item("Queued permit", "third_party");
  const failed = item("Failed year", "automated");
  const classification = item("Reclassifying permit", "third_party");

  const result = summarizeJobBrief(
    context,
    [active, queued, failed, classification],
    [
      state(active, { execution: "running", finding: year }),
      state(queued, { queued: true, execution: "waiting", draft }),
      state(failed, {
        execution: "failed",
        finding: year,
        error: "api_timeout",
      }),
      state(classification, {
        execution: "waiting",
        classification: { status: "failed", error: "invalid_classification" },
        draft,
      }),
    ],
  );

  expect(result.completed).toHaveLength(0);
  expect(result.drafts).toHaveLength(0);
  expect(result.processing).toBe(2);
  expect(
    result.actions.filter((action) =>
      action.detail.includes("Processing failed"),
    ),
  ).toHaveLength(2);
  expect(result.actions.some((action) => action.detail.includes("1940"))).toBe(
    false,
  );
});

test("changed saved address or job fields invalidate summary outputs without changing completed checkboxes", () => {
  const construction = item("Construction year", "automated", "done");
  const permit = item("Building permit", "third_party");

  const states = [
    state(construction, { finding: year }),
    state(permit, { execution: "waiting", draft }),
  ];

  const changed = {
    ...context,
    job: { ...context.job, addressText: "A different saved address" },
  };

  const result = summarizeJobBrief(changed, [construction, permit], states);
  expect(result.completed).toHaveLength(1);
  expect(result.completed[0].detail).not.toContain("1940");
  expect(result.drafts).toHaveLength(0);
  expect(result.actions).toHaveLength(2);
  expect(result.actions[0].detail).toContain("earlier result");
  expect(
    summarizeJobBrief(
      context,
      [permit],
      [state(permit, { execution: "waiting", draft, snapshot: undefined })],
    ).drafts,
  ).toHaveLength(0);
});

test("reopened and reclassified manual items do not inherit automated completion", () => {
  const reopened = item("Construction year", "automated");
  const onsite = item("Site assessment", "on_site");

  const result = summarizeJobBrief(
    context,
    [reopened, onsite],
    [state(reopened, { finding: year }), state(onsite, { finding: year })],
  );

  expect(result.completed).toHaveLength(0);
  expect(result.actions).toHaveLength(2);
  expect(result.actions.some((action) => action.detail.includes("1940"))).toBe(
    false,
  );
});

test("positive road matches suggest travel review; zero matches never establish a clear route", () => {
  const road = item("Road Closure", "automated", "done");

  const positive = summarizeJobBrief(
    context,
    [road],
    [state(road, { finding: roads })],
  );

  expect(positive.completed[0].detail).toContain("15 published disruptions");
  expect(positive.actions[0].detail).toContain(
    "not necessarily a full closure",
  );

  const zero = summarizeJobBrief(
    context,
    [road],
    [state(road, { finding: { ...roads, matchCount: 0 } })],
  );

  expect(zero.actions).toHaveLength(0);
  expect(zero.completed[0].detail).toContain(
    "does not establish a clear route",
  );
});

test("classification failure remains visible when the saved kind is human-only", () => {
  const asbestos = item("Asbestos assessment", "on_site");

  const result = summarizeJobBrief(
    context,
    [asbestos],
    [
      state(asbestos, {
        classification: { status: "failed", error: "classification_invalid" },
      }),
    ],
  );

  expect(result.actions[0].detail).toContain("Classification failed");
  expect(result.actions[0].detail).toContain("human asbestos/site assessment");
});

test("building and occupancy drafts have distinct next steps without claiming approvals", () => {
  const building = item("Building Permit", "third_party");
  const occupancy = item("Occupancy Permit", "third_party");

  const result = summarizeJobBrief(
    context,
    [building, occupancy],
    [
      state(building, { execution: "waiting", draft }),
      state(occupancy, {
        execution: "waiting",
        draft: { ...draft, formKey: "occupancy-inspection-request" },
      }),
    ],
  );

  expect(result.actions[0].detail).toContain("surveyor");
  expect(result.actions[1].detail).toContain("On completion");
  expect(result.actions[1].detail).toContain(
    "actual building-permit reference",
  );
});
