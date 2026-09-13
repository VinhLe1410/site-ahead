/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../../schema";
import { internal } from "../../_generated/api";
import {
  resolveLiveEvidence,
  SOURCES,
  type EvidenceFetch,
} from "./liveEvidence";

const modules = import.meta.glob("../../**/*.ts");

const now = Date.UTC(2026, 8, 13, 12);

async function context(title: string, year?: number) {
  const t = convexTest(schema, modules);

  const fixture = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Contractor" });

    const organizationId = await ctx.db.insert("organizations", {
      name: "Evidence test",
    });

    await ctx.db.insert("memberships", {
      userId,
      organizationId,
      role: "owner",
      state: "active",
    });

    const inputId = await ctx.db.insert("inputs", {
      organizationId,
      addressText: "80 Wellington Parade EAST MELBOURNE 3002",
      processedText: "Saved job scope",
    });

    const jobId = await ctx.db.insert("jobs", {
      organizationId,
      inputId,
      addressText: "80 Wellington Parade EAST MELBOURNE 3002",
      status: "pending",
      confirmedConstructionYear:
        year === undefined
          ? undefined
          : { year, suppliedBy: userId, suppliedAt: now - 1000 },
      agentContext: {
        latitude: -37.7784,
        longitude: 145.0306,
        roadName: "Wellington Parade",
        locality: "East Melbourne",
        suppliedBy: userId,
        suppliedAt: now - 1000,
      },
    });

    const itemId = await ctx.db.insert("checklistItems", {
      jobId,
      title,
      kind: "automated",
      status: "pending",
      notes: "1970 is only an unconfirmed note",
    });

    return { itemId, userId };
  });

  const result = await t.query(internal.jobAgentContext.get, {
    itemId: fixture.itemId,
    initiatedBy: fixture.userId,
  });

  if (result === null) throw new Error("Missing fixture context");

  return result;
}

const liveRecord = {
  _id: 1,
  census_year: "2025",
  construction_year: "1940",
  property_id: "prop1",
  street_address: "80 Wellington Parade EAST MELBOURNE 3002",
};

const noMatch: EvidenceFetch = async () =>
  Response.json({ success: true, result: { total: 0, records: [] } });

test("DataVic live year wins over attributed manual year and retains structured provenance", async () => {
  const saved = await context("Construction year", 1985);

  const fetcher: EvidenceFetch = async () =>
    Response.json({
      success: true,
      result: { total: 1, records: [liveRecord] },
    });

  const result = await resolveLiveEvidence(
    "construction_year",
    saved,
    fetcher,
    now,
  );

  expect(result).toMatchObject({
    status: "resolved",
    finding: {
      constructionYear: 1940,
      pre1990: true,
      resolution: "live_api",
      sourceRecordId: 1,
      propertyId: "prop1",
    },
    provenance: [{ source: SOURCES.construction_year, method: "live_api" }],
  });
});

test("only successful exact miss or absent year permits attributed manual fallback", async () => {
  const saved = await context("Construction year", 1985);

  const absentYear: EvidenceFetch = async () =>
    Response.json({
      success: true,
      result: {
        total: 1,
        records: [{ ...liveRecord, construction_year: null }],
      },
    });

  for (const fetcher of [noMatch, absentYear]) {
    const result = await resolveLiveEvidence(
      "construction_year",
      saved,
      fetcher,
      now,
    );

    expect(result).toMatchObject({
      status: "resolved",
      finding: { constructionYear: 1985, resolution: "manual_fallback" },
    });
    expect(result.provenance[1]).toMatchObject({
      method: "manual",
      suppliedBy: saved.job.confirmedConstructionYear?.suppliedBy,
      observedAt: now - 1000,
    });
  }

  const withoutManual = await context("Construction year");
  expect(
    await resolveLiveEvidence("construction_year", withoutManual, noMatch, now),
  ).toMatchObject({ status: "unresolved", reason: "no_exact_address_match" });
});

test("network, unsuccessful CKAN, malformed year and incomplete lookup never activate fallback", async () => {
  const saved = await context("Construction year", 1985);

  const failedResponses: EvidenceFetch[] = [
    async () => {
      throw new Error("Network unavailable");
    },
    async () => new Response("Unavailable", { status: 503 }),
    async () =>
      Response.json({ success: false, result: { total: 0, records: [] } }),
    async () =>
      Response.json({
        success: true,
        result: {
          total: 1,
          records: [{ ...liveRecord, construction_year: "invalid" }],
        },
      }),
    async () =>
      Response.json({ success: true, result: { total: 500, records: [] } }),
  ];

  for (const fetcher of failedResponses)
    await expect(
      resolveLiveEvidence("construction_year", saved, fetcher, now),
    ).rejects.toThrow();
});

test("manual year validation is repeated at the tool boundary", async () => {
  const saved = await context("Construction year", 1799);
  await expect(
    resolveLiveEvidence("construction_year", saved, noMatch, now),
  ).rejects.toThrow("construction_year_invalid");
});

const station = {
  id: "station1",
  siteName: "Alphington",
  lat: -37.7784,
  lng: 145.0306,
  until: new Date(now - 3_600_000).toISOString(),
  averageValue: 3.7,
  unit: "ug/m3",
  healthParameter: "PM2.5",
  healthAdvice: "Good",
};

test("air evidence requires site coordinates and retains the nearby station value, time and distance", async () => {
  const saved = await context("Air Quality");
  const fetcher: EvidenceFetch = async () => Response.json([station]);
  expect(
    await resolveLiveEvidence("air_quality", saved, fetcher, now),
  ).toMatchObject({
    status: "resolved",
    finding: {
      stationId: "station1",
      value: 3.7,
      pollutant: "PM2.5",
      distanceKm: 0,
      observedAt: now - 3_600_000,
      scope: "nearby_monitoring_station",
    },
  });
  delete saved.job.agentContext;
  expect(
    await resolveLiveEvidence("air_quality", saved, fetcher, now),
  ).toMatchObject({
    status: "unresolved",
    reason: "confirmed_site_coordinates_required",
  });
});

test("distant, missing or stale station data cannot complete a site check", async () => {
  const saved = await context("Air Quality");
  expect(
    await resolveLiveEvidence(
      "air_quality",
      saved,
      async () => Response.json([{ ...station, lat: -34.2, lng: 142.1 }]),
      now,
    ),
  ).toMatchObject({
    status: "unresolved",
    reason: "no_monitoring_station_within_coverage_radius",
  });
  expect(
    await resolveLiveEvidence(
      "air_quality",
      saved,
      async () => Response.json([{ ...station, averageValue: null }]),
      now,
    ),
  ).toMatchObject({
    status: "unresolved",
    reason: "nearest_station_has_no_current_reading",
  });
  await expect(
    resolveLiveEvidence(
      "air_quality",
      saved,
      async () =>
        Response.json([{ ...station, until: "2026-01-01T00:00:00Z" }]),
      now,
    ),
  ).rejects.toThrow("source_snapshot_stale");
});

const disruption = {
  id: "road1",
  source: "RID",
  location: [144.99, -37.81],
  closedRoadName: "Wellington Parade",
  startIntersectionLocality: "East Melbourne",
  eventType: "Roadworks",
  impactType: "Road Closed",
  status: "Active",
  start: "2026-09-12T00:00:00Z",
  end: "2026-09-15T00:00:00Z",
  updated: "2026-09-13T09:00:00Z",
  description: "Published road closure",
};

test("road evidence retains exact matching records and rejects incomplete pagination", async () => {
  const saved = await context("Road Closure");

  const fetcher: EvidenceFetch = async () =>
    Response.json({
      state: {
        ts: now - 1000,
        items: {
          match: { data: disruption },
          other: {
            data: {
              ...disruption,
              id: "other",
              startIntersectionLocality: "West Melbourne",
            },
          },
        },
      },
      meta: { cursor: "-1" },
    });

  expect(
    await resolveLiveEvidence("road_closures", saved, fetcher, now),
  ).toMatchObject({
    status: "resolved",
    finding: {
      matchCount: 1,
      completeSnapshot: true,
      records: [{ id: "road1", locality: "East Melbourne" }],
    },
  });

  const repeat: EvidenceFetch = async () =>
    Response.json({
      state: { ts: now - 1000, items: {} },
      meta: { cursor: "0" },
    });

  await expect(
    resolveLiveEvidence("road_closures", saved, repeat, now),
  ).rejects.toThrow("road_pagination_repeated_cursor");
});

test("road zero-match finding requires complete scoped snapshot; unrelated tools are rejected", async () => {
  const saved = await context("Road Closure");

  const fetcher: EvidenceFetch = async () =>
    Response.json({
      state: { ts: now - 1000, items: {} },
      meta: { cursor: "-1" },
    });

  expect(
    await resolveLiveEvidence("road_closures", saved, fetcher, now),
  ).toMatchObject({
    status: "resolved",
    finding: {
      matchCount: 0,
      completeSnapshot: true,
      roadName: "Wellington Parade",
      locality: "East Melbourne",
    },
  });
  delete saved.job.agentContext;
  expect(
    await resolveLiveEvidence("road_closures", saved, fetcher, now),
  ).toMatchObject({
    status: "unresolved",
    reason: "confirmed_road_and_locality_required",
  });
  await expect(
    resolveLiveEvidence("air_quality", saved, fetcher, now),
  ).rejects.toThrow("item_tool_mismatch");
});

test("malformed imported coordinates cannot resolve an air check", async () => {
  const saved = await context("Air Quality");

  if (saved.job.agentContext === undefined)
    throw new Error("Missing fixture fields");

  for (const latitude of [Number.NaN, Number.POSITIVE_INFINITY, 100, -80]) {
    saved.job.agentContext.latitude = latitude;
    await expect(
      resolveLiveEvidence(
        "air_quality",
        saved,
        async () => Response.json([station]),
        now,
      ),
    ).rejects.toThrow("confirmed_site_coordinates_invalid");
  }
});

test("provider diagnostics preserve HTTP status and distinguish timeout without leaking response bodies", async () => {
  const saved = await context("Construction year", 1985);

  for (const status of [401, 403, 503]) {
    await expect(
      resolveLiveEvidence(
        "construction_year",
        saved,
        async () => new Response("secret provider body", { status }),
        now,
      ),
    ).rejects.toMatchObject({
      code: `source_http_${status}`,
      source: SOURCES.construction_year,
    });
  }

  await expect(
    resolveLiveEvidence(
      "construction_year",
      saved,
      async () => {
        throw new DOMException("secret transport details", "TimeoutError");
      },
      now,
    ),
  ).rejects.toMatchObject({ code: "source_timeout" });
});

test("construction lookup rejects changed totals, duplicate records and inconsistent page counts before manual fallback", async () => {
  const saved = await context("Construction year", 1985);

  const page = Array.from({ length: 100 }, (_, index) => ({
    ...liveRecord,
    _id: index + 1,
    street_address: "Unrelated address",
  }));

  for (const [responses, code] of [
    [
      [
        { total: 500, records: page },
        { total: 0, records: [] },
      ],
      "construction_lookup_total_changed",
    ],
    [
      [
        { total: 200, records: page },
        { total: 200, records: page },
      ],
      "construction_lookup_duplicate_record",
    ],
    [
      [{ total: 2, records: [page[0], page[0]] }],
      "construction_lookup_duplicate_record",
    ],
    [[{ total: 0, records: [page[0]] }], "construction_lookup_count_invalid"],
    [[{ total: 101, records: [page[0]] }], "construction_lookup_incomplete"],
  ] as const) {
    let request = 0;
    await expect(
      resolveLiveEvidence(
        "construction_year",
        saved,
        async () =>
          Response.json({ success: true, result: responses[request++] }),
        now,
      ),
    ).rejects.toMatchObject({ code });
  }
});

test("an exact road/locality match with missing or unknown publisher cannot become a zero-match finding", async () => {
  const saved = await context("Road Closure");

  for (const source of [undefined, null, "", "unknown-publisher"]) {
    await expect(
      resolveLiveEvidence(
        "road_closures",
        saved,
        async () =>
          Response.json({
            state: {
              ts: now - 1000,
              items: { match: { data: { ...disruption, source } } },
            },
            meta: { cursor: "-1" },
          }),
        now,
      ),
    ).rejects.toMatchObject({ code: "matching_road_source_unknown" });
  }
});
