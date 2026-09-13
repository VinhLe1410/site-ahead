import { v, type Infer } from "convex/values";
import { z } from "zod";
import { agentFindingValidator } from "../../evidenceContracts";
import {
  evidenceProvenanceValidator,
  missingFieldValidator,
  validateConstructionYear,
} from "../../agentContracts";
import type { ItemContext } from "../../jobAgentContext";

export const SOURCES = {
  construction_year:
    "https://discover.data.vic.gov.au/api/3/action/datastore_search",
  air_quality: "https://www.epa.vic.gov.au/api/environment/air/sites",
  road_closures: "https://api.traffic.transport.vic.gov.au/disruptions",
};

const RESOURCE_ID = "541d923d-a458-492a-88c2-edd8a3aaf85b";

// These are explicit coverage/freshness limits for the demo, not safety limits.
// AirWatch is an hourly ambient station feed, never a site-specific measurement.
export const AIR_RADIUS_KM = 25;

export const AIR_MAX_AGE_HOURS = 6;

// VicTraffic's public cached snapshot can lag by hours; retain its actual timestamp.
export const ROAD_MAX_AGE_HOURS = 24;

// Observed VicTraffic pages contain 2,000 records and about 3.3 MB of JSON.
const MAX_RESPONSE_BYTES = 5_000_000;

export type EvidenceKind = keyof typeof SOURCES;

export type EvidenceFetch = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export type EvidenceFinding = Infer<typeof agentFindingValidator>;

export type EvidenceProvenance = Infer<typeof evidenceProvenanceValidator>;

export const evidenceResultValidator = v.union(
  v.object({
    status: v.literal("resolved"),
    finding: agentFindingValidator,
    provenance: v.array(evidenceProvenanceValidator),
  }),
  v.object({
    status: v.literal("unresolved"),
    reason: v.string(),
    missingInformation: v.array(missingFieldValidator),
    provenance: v.array(evidenceProvenanceValidator),
  }),
);

export type EvidenceResult = Infer<typeof evidenceResultValidator>;

export class EvidenceFailure extends Error {
  constructor(
    readonly code: string,
    readonly source: string,
  ) {
    super(code);
    this.name = "EvidenceFailure";
  }
}

export function evidenceKind(title: string): EvidenceKind | null {
  const value = title.trim().toLowerCase();

  if (value.includes("construction year")) return "construction_year";

  if (value.includes("air quality")) return "air_quality";

  if (value.includes("road closure")) return "road_closures";

  return null;
}

function normalize(value: string) {
  return value.toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
  fetcher: EvidenceFetch,
  source: string,
  signal: AbortSignal,
): Promise<T> {
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    });

    if (!response.ok)
      throw new EvidenceFailure(`source_http_${response.status}`, source);
    const reader = response.body?.getReader();

    if (reader === undefined)
      throw new EvidenceFailure("source_empty_response", source);
    const chunks: Uint8Array[] = [];
    let size = 0;

    while (true) {
      const chunk = await reader.read();

      if (chunk.done) break;
      size += chunk.value.length;

      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new EvidenceFailure("source_response_too_large", source);
      }

      chunks.push(chunk.value);
    }

    const bytes = new Uint8Array(size);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }

    return schema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    if (error instanceof EvidenceFailure) throw error;

    if (error instanceof z.ZodError || error instanceof SyntaxError)
      throw new EvidenceFailure("source_response_invalid", source);

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    )
      throw new EvidenceFailure("source_timeout", source);
    throw new EvidenceFailure("source_network_failure", source);
  }
}

function timestamp(
  value: number,
  source: string,
  now: number,
  maximumAgeHours?: number,
) {
  const result = value;

  if (!Number.isFinite(result) || result <= 0 || result > now + 300_000)
    throw new EvidenceFailure("source_timestamp_invalid", source);

  if (
    maximumAgeHours !== undefined &&
    now - result > maximumAgeHours * 3_600_000
  )
    throw new EvidenceFailure("source_snapshot_stale", source);

  return result;
}

function missing(
  reason: string,
  field: string,
  label: string,
  provenance: EvidenceProvenance[] = [],
): EvidenceResult {
  return {
    status: "unresolved",
    reason,
    missingInformation: [{ field, label, reason }],
    provenance,
  };
}

const optionalNumber = z.union([z.string(), z.number()]).nullable().optional();

const optionalString = z.string().nullable().optional();

const buildingRecord = z.object({
  _id: z.number().int(),
  street_address: optionalString,
  census_year: optionalNumber,
  construction_year: optionalNumber,
  property_id: optionalString,
});

const buildingResponse = z.object({
  success: z.literal(true),
  result: z.object({
    total: z.number().int().nonnegative(),
    records: z.array(buildingRecord).max(100),
  }),
});

function yearValue(
  value: string | number | null | undefined,
  now: number,
): number | null {
  if (value === undefined || value === null || String(value).trim() === "")
    return null;

  try {
    return validateConstructionYear(Number(value), now);
  } catch {
    throw new EvidenceFailure(
      "construction_year_invalid",
      SOURCES.construction_year,
    );
  }
}

async function constructionYear(
  context: ItemContext,
  fetcher: EvidenceFetch,
  now: number,
  signal: AbortSignal,
): Promise<EvidenceResult> {
  const source = SOURCES.construction_year;
  const address = context.job.addressText.trim();

  if (address === "")
    return missing("property_address_required", "address", "Property address");
  const records: Array<z.infer<typeof buildingRecord>> = [];
  let total: number | undefined;
  const recordIds = new Set<number>();

  for (let page = 0; page < 3; page += 1) {
    const url = new URL(source);
    url.searchParams.set("resource_id", RESOURCE_ID);
    url.searchParams.set("q", address);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(page * 100));

    const payload = await fetchJson(
      url.toString(),
      buildingResponse,
      fetcher,
      source,
      signal,
    );

    if (total !== undefined && total !== payload.result.total)
      throw new EvidenceFailure("construction_lookup_total_changed", source);
    total ??= payload.result.total;

    for (const record of payload.result.records) {
      if (recordIds.has(record._id))
        throw new EvidenceFailure(
          "construction_lookup_duplicate_record",
          source,
        );
      recordIds.add(record._id);
      records.push(record);
    }

    if (records.length > total)
      throw new EvidenceFailure("construction_lookup_count_invalid", source);

    if (records.length === total) break;

    if (payload.result.records.length !== 100 || page === 2)
      throw new EvidenceFailure("construction_lookup_incomplete", source);
  }

  const matching = records.filter(
    (record) => normalize(record.street_address ?? "") === normalize(address),
  );

  const withYears = matching.map((record) => ({
    record,
    year: yearValue(record.construction_year, now),
    census: yearValue(record.census_year, now),
  }));

  const latest = withYears
    .filter((record) => record.year !== null)
    .sort((a, b) => (b.census ?? 0) - (a.census ?? 0));

  const selected = latest[0];

  const lookupProvenance: EvidenceProvenance = {
    source,
    method: "live_api",
    observedAt: now,
    reference: `City of Melbourne CLUE building information; resource ${RESOURCE_ID}; ${total} search records examined`,
  };

  const coverage =
    "City of Melbourne CLUE records only. This is historical building information, not a statewide register or asbestos assessment.";

  if (selected !== undefined && selected.year !== null) {
    if (
      latest.some(
        (record) =>
          record.census === selected.census && record.year !== selected.year,
      )
    )
      throw new EvidenceFailure("construction_year_ambiguous", source);

    const finding: Infer<
      typeof import("../../evidenceContracts").constructionFindingValidator
    > = {
      kind: "construction_year",
      summary: `DataVic records construction year ${selected.year}; ${selected.year < 1990 ? "before" : "from or after"} 1990.`,
      observedAt: now,
      address,
      constructionYear: selected.year,
      pre1990: selected.year < 1990,
      resolution: "live_api",
      lookupOutcome: "exact_match",
      sourceRecordId: selected.record._id,
      coverage,
    };

    if (selected.census !== null) finding.censusYear = selected.census;

    if (selected.record.property_id)
      finding.propertyId = selected.record.property_id;

    return { status: "resolved", finding, provenance: [lookupProvenance] };
  }

  const lookupOutcome =
    matching.length === 0
      ? "no_exact_address_match"
      : "matching_address_has_no_construction_year";

  const manual = context.job.confirmedConstructionYear;

  if (manual === undefined)
    return missing(
      lookupOutcome,
      "constructionYear",
      "Contractor-confirmed construction year",
      [lookupProvenance],
    );
  const year = yearValue(manual.year, now);

  if (
    year === null ||
    !Number.isFinite(manual.suppliedAt) ||
    manual.suppliedAt <= 0 ||
    manual.suppliedAt > now
  )
    throw new EvidenceFailure("manual_year_attribution_invalid", source);

  return {
    status: "resolved",
    finding: {
      kind: "construction_year",
      summary: `Contractor-confirmed construction year ${year}; ${year < 1990 ? "before" : "from or after"} 1990. DataVic did not supply a matching usable year.`,
      observedAt: manual.suppliedAt,
      address,
      constructionYear: year,
      pre1990: year < 1990,
      resolution: "manual_fallback",
      lookupOutcome,
      coverage: `${coverage} This year is manually supplied, not API-verified.`,
    },
    provenance: [
      lookupProvenance,
      {
        source: "contractor_confirmed_job_year",
        method: "manual",
        observedAt: manual.suppliedAt,
        suppliedBy: manual.suppliedBy,
        reference: lookupOutcome,
      },
    ],
  };
}

const airResponse = z
  .array(
    z.object({
      id: z.string().min(1),
      siteName: z.string().min(1),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      until: optionalString,
      averageValue: optionalNumber,
      unit: optionalString,
      healthParameter: optionalString,
      healthAdvice: optionalString,
    }),
  )
  .min(1)
  .max(200);

function distanceKm(
  latitude: number,
  longitude: number,
  lat: number,
  lng: number,
) {
  const radians = Math.PI / 180;

  const a =
    Math.sin(((lat - latitude) * radians) / 2) ** 2 +
    Math.cos(latitude * radians) *
      Math.cos(lat * radians) *
      Math.sin(((lng - longitude) * radians) / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function airQuality(
  context: ItemContext,
  fetcher: EvidenceFetch,
  now: number,
  signal: AbortSignal,
): Promise<EvidenceResult> {
  const source = SOURCES.air_quality;
  const fields = context.job.agentContext;

  if (fields?.latitude === undefined || fields.longitude === undefined)
    return missing(
      "confirmed_site_coordinates_required",
      "coordinates",
      "Site latitude and longitude",
    );
  const { latitude, longitude } = fields;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -39.2 ||
    latitude > -33.9 ||
    longitude < 140.9 ||
    longitude > 149.1
  )
    throw new EvidenceFailure("confirmed_site_coordinates_invalid", source);

  const stations = await fetchJson(
    source,
    airResponse,
    fetcher,
    source,
    signal,
  );

  const nearby = stations
    .map((station) => ({
      station,
      distance: distanceKm(latitude, longitude, station.lat, station.lng),
    }))
    .sort((a, b) => a.distance - b.distance);

  const selected = nearby[0];

  const provenance: EvidenceProvenance[] = [
    { source, method: "live_api", observedAt: now },
  ];

  if (selected.distance > AIR_RADIUS_KM)
    return missing(
      "no_monitoring_station_within_coverage_radius",
      "airQualityCoverage",
      `Monitoring data within ${AIR_RADIUS_KM} km`,
      provenance,
    );
  const station = selected.station;

  if (
    station.averageValue === undefined ||
    station.averageValue === null ||
    String(station.averageValue).trim() === "" ||
    station.healthAdvice?.toLowerCase() === "no data"
  )
    return missing(
      "nearest_station_has_no_current_reading",
      "airQualityReading",
      "Current nearby monitoring reading",
      provenance,
    );
  const value = Number(station.averageValue);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !station.unit?.trim() ||
    !station.healthParameter?.trim() ||
    !station.until
  )
    throw new EvidenceFailure("air_reading_invalid", source);

  const observedAt = timestamp(
    Date.parse(station.until),
    source,
    now,
    AIR_MAX_AGE_HOURS,
  );

  const unit = station.unit
    .replace(/&micro;/g, "µ")
    .replace(/&sup3;/g, "³")
    .replace(/&sup2;/g, "²");

  return {
    status: "resolved",
    finding: {
      kind: "air_quality",
      summary: `${station.siteName}: ${value} ${unit} ${station.healthParameter}, ${selected.distance.toFixed(1)} km from the saved site.`,
      observedAt,
      fetchedAt: now,
      scope: "nearby_monitoring_station",
      siteLatitude: fields.latitude,
      siteLongitude: fields.longitude,
      stationId: station.id,
      stationName: station.siteName,
      stationLatitude: station.lat,
      stationLongitude: station.lng,
      distanceKm: selected.distance,
      value,
      unit,
      pollutant: station.healthParameter,
      sourceAdvice: station.healthAdvice ?? "",
      coverageRadiusKm: AIR_RADIUS_KM,
      maxReadingAgeHours: AIR_MAX_AGE_HOURS,
      coverage:
        "Nearby ambient monitoring proxy, not a measurement at the worksite or a determination that site work is safe. The 25 km coverage radius and 6-hour freshness limit bound this demo's data selection.",
    },
    provenance: [
      { source, method: "live_api", observedAt, reference: station.id },
      {
        source: "confirmed_job_coordinates",
        method: "manual",
        observedAt: fields.suppliedAt,
        suppliedBy: fields.suppliedBy,
      },
    ],
  };
}

const roadData = z.object({
  id: optionalString,
  source: optionalString,
  location: z
    .array(z.union([z.number(), z.string()]).nullable())
    .nullable()
    .optional(),
  closedRoadName: optionalString,
  startIntersectionLocality: optionalString,
  eventType: optionalString,
  impactType: optionalString,
  status: optionalString,
  start: optionalString,
  end: optionalString,
  updated: optionalString,
  description: optionalString,
});

const roadResponse = z.object({
  state: z.object({
    ts: z.union([z.number(), z.string()]),
    items: z.record(z.string(), z.object({ data: roadData })),
  }),
  meta: z.object({ cursor: z.string() }),
});

async function roadClosures(
  context: ItemContext,
  fetcher: EvidenceFetch,
  now: number,
  signal: AbortSignal,
): Promise<EvidenceResult> {
  const source = SOURCES.road_closures;
  const fields = context.job.agentContext;

  if (!fields?.roadName?.trim() || !fields.locality?.trim())
    return missing(
      "confirmed_road_and_locality_required",
      "roadLocation",
      "Road name and locality",
    );

  const records = new Map<
    string,
    Infer<typeof import("../../evidenceContracts").roadRecordValidator>
  >();

  const seen = new Set<string>();
  let cursor = "0";
  let observedAt = now;
  let complete = false;

  for (let page = 0; page < 15; page += 1) {
    if (seen.has(cursor))
      throw new EvidenceFailure("road_pagination_repeated_cursor", source);
    seen.add(cursor);
    const url = new URL(source);
    url.searchParams.set("baselineId", "0");
    url.searchParams.set("lastSeenId", "0");
    url.searchParams.set("cursor", cursor);

    const response = await fetchJson(
      url.toString(),
      roadResponse,
      fetcher,
      source,
      signal,
    );

    const snapshotAt = timestamp(
      Number(response.state.ts),
      source,
      now,
      ROAD_MAX_AGE_HOURS,
    );

    if (page > 0 && snapshotAt !== observedAt)
      throw new EvidenceFailure(
        "road_snapshot_changed_during_pagination",
        source,
      );
    observedAt = snapshotAt;

    for (const [id, { data }] of Object.entries(response.state.items)) {
      if (
        !data.closedRoadName ||
        !data.startIntersectionLocality ||
        normalize(data.closedRoadName) !== normalize(fields.roadName) ||
        normalize(data.startIntersectionLocality) !== normalize(fields.locality)
      )
        continue;

      if (!["DPF", "MTIA", "OneView", "RID", "RWE"].includes(data.source ?? ""))
        throw new EvidenceFailure("matching_road_source_unknown", source);
      const latitude = Number(data.location?.[1]);
      const longitude = Number(data.location?.[0]);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -39.2 ||
        latitude > -33.9 ||
        longitude < 140.9 ||
        longitude > 149.1
      )
        throw new EvidenceFailure("matching_road_location_invalid", source);

      const description = (data.description ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (
        !/clos|road restriction/i.test(
          `${data.impactType ?? ""} ${data.eventType ?? ""} ${description}`,
        )
      )
        continue;

      if (
        !data.updated ||
        !data.start ||
        !data.end ||
        !data.status ||
        !data.eventType ||
        !data.impactType
      )
        throw new EvidenceFailure("matching_road_record_incomplete", source);
      const updatedAt = timestamp(Date.parse(data.updated), source, now);

      if (
        !Number.isFinite(Date.parse(data.start)) ||
        !Number.isFinite(Date.parse(data.end))
      )
        throw new EvidenceFailure("matching_road_dates_invalid", source);

      if (Date.parse(data.end) < now) continue;
      records.set(data.id ?? id, {
        id: data.id ?? id,
        source: data.source ?? "",
        roadName: data.closedRoadName,
        locality: data.startIntersectionLocality,
        eventType: data.eventType,
        impactType: data.impactType,
        status: data.status,
        start: data.start,
        end: data.end,
        updatedAt,
        description: description.slice(0, 4000),
        latitude,
        longitude,
      });

      if (records.size > 100)
        throw new EvidenceFailure("too_many_matching_road_records", source);
    }

    cursor = response.meta.cursor;

    if (cursor === "-1") {
      complete = true;
      break;
    }
  }

  if (!complete) throw new EvidenceFailure("road_snapshot_incomplete", source);

  return {
    status: "resolved",
    finding: {
      kind: "road_closures",
      summary: `${records.size} published closure or restriction records match ${fields.roadName}, ${fields.locality}.`,
      observedAt,
      fetchedAt: now,
      scope: "exact_road_and_locality",
      roadName: fields.roadName,
      locality: fields.locality,
      completeSnapshot: true,
      matchCount: records.size,
      records: [...records.values()],
      maxSnapshotAgeHours: ROAD_MAX_AGE_HOURS,
      coverage:
        "Complete public feed snapshot filtered to the exact saved road/locality and Victorian publishers. Includes active/future published records. A zero match is not a guarantee of unrestricted access; snapshot freshness is bounded to 24 hours because this public feed can be cached.",
    },
    provenance: [
      { source, method: "live_api", observedAt },
      {
        source: "confirmed_job_road_and_locality",
        method: "manual",
        observedAt: fields.suppliedAt,
        suppliedBy: fields.suppliedBy,
      },
    ],
  };
}

export async function resolveLiveEvidence(
  kind: EvidenceKind,
  context: ItemContext,
  fetcher: EvidenceFetch = fetch,
  now = Date.now(),
): Promise<EvidenceResult> {
  if (evidenceKind(context.item.title) !== kind)
    throw new EvidenceFailure("item_tool_mismatch", SOURCES[kind]);
  const signal = AbortSignal.timeout(90_000);

  switch (kind) {
    case "construction_year":
      return await constructionYear(context, fetcher, now, signal);
    case "air_quality":
      return await airQuality(context, fetcher, now, signal);
    case "road_closures":
      return await roadClosures(context, fetcher, now, signal);
  }
}
