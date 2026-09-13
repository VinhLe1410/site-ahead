import { action } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";

const EPA_AIR_SITES_URL =
  "https://www.epa.vic.gov.au/api/environment/air/sites";

const VICTRAFFIC_DISRUPTIONS_URL =
  "https://api.traffic.transport.vic.gov.au/disruptions";

const BUILDING_INFORMATION_DATASTORE_URL =
  "https://discover.data.vic.gov.au/api/3/action/datastore_search";

const BUILDING_INFORMATION_RESOURCE_ID = "541d923d-a458-492a-88c2-edd8a3aaf85b";

const checklistItemIdValidator = v.union(v.number(), v.string());

const itemContextValidator = v.object({
  constructionYear: v.optional(v.number()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  roadName: v.optional(v.string()),
  locality: v.optional(v.string()),
});

const checklistItemValidator = v.object({
  id: checklistItemIdValidator,
  item: v.string(),
  context: v.optional(itemContextValidator),
});

const airQualitySiteValidator = v.object({
  id: v.string(),
  siteName: v.string(),
  siteType: v.string(),
  region: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  observedAt: v.string(),
  pollutant: v.string(),
  averageValue: v.union(v.number(), v.null()),
  unit: v.union(v.string(), v.null()),
  healthAdvice: v.string(),
});

const roadDisruptionValidator = v.object({
  id: v.string(),
  source: v.string(),
  kind: v.string(),
  status: v.string(),
  roadName: v.string(),
  locality: v.string(),
  eventType: v.string(),
  impactType: v.string(),
  start: v.string(),
  end: v.string(),
  updated: v.string(),
  description: v.string(),
  latitude: v.union(v.number(), v.null()),
  longitude: v.union(v.number(), v.null()),
});

const automatedCheckDataValidator = v.union(
  v.object({
    kind: v.literal("construction_year"),
    constructionYear: v.number(),
    pre1990: v.boolean(),
    rule: v.literal("pre_1990_construction"),
    resolution: v.union(v.literal("live_api"), v.literal("manual_fallback")),
    censusYear: v.optional(v.number()),
    propertyId: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("air_quality"),
    scope: v.union(v.literal("statewide"), v.literal("nearest_site")),
    siteCount: v.number(),
    sites: v.array(airQualitySiteValidator),
  }),
  v.object({
    kind: v.literal("road_closures"),
    scope: v.union(v.literal("statewide"), v.literal("location_filtered")),
    snapshotAt: v.string(),
    matchCount: v.number(),
    records: v.array(roadDisruptionValidator),
  }),
  v.object({
    kind: v.literal("unresolved"),
    reason: v.string(),
    attemptedSource: v.string(),
  }),
);

const automatedCheckResultValidator = v.object({
  id: checklistItemIdValidator,
  status: v.union(v.literal("resolved"), v.literal("unresolved")),
  data: automatedCheckDataValidator,
  source: v.string(),
});

const rawNumberSchema = z.union([z.number(), z.string()]).nullable().optional();

const optionalStringSchema = z.string().nullable().optional();

const airQualitySiteResponseSchema = z.array(
  z.object({
    id: z.string(),
    siteName: z.string(),
    siteType: z.string(),
    region: optionalStringSchema,
    lat: rawNumberSchema,
    lng: rawNumberSchema,
    since: optionalStringSchema,
    until: optionalStringSchema,
    healthParameter: optionalStringSchema,
    averageValue: rawNumberSchema,
    unit: optionalStringSchema,
    healthAdvice: optionalStringSchema,
  }),
);

const roadDisruptionResponseSchema = z.object({
  id: optionalStringSchema,
  source: optionalStringSchema,
  kind: optionalStringSchema,
  status: optionalStringSchema,
  location: z
    .array(z.union([z.number(), z.string()]).nullable())
    .nullable()
    .optional(),
  start: optionalStringSchema,
  end: optionalStringSchema,
  eventType: optionalStringSchema,
  impactType: optionalStringSchema,
  closedRoadName: optionalStringSchema,
  startIntersectionLocality: optionalStringSchema,
  updated: optionalStringSchema,
  description: optionalStringSchema,
});

const vicTrafficResponseSchema = z.object({
  state: z.object({
    ts: z.union([z.number(), z.string()]),
    items: z.record(
      z.string(),
      z.object({ data: roadDisruptionResponseSchema }),
    ),
  }),
  meta: z.object({ cursor: z.string() }),
});

const buildingInformationResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    total: z.number(),
    records: z.array(
      z.object({
        _id: z.number(),
        census_year: rawNumberSchema,
        property_id: optionalStringSchema,
        street_address: optionalStringSchema,
        construction_year: rawNumberSchema,
      }),
    ),
  }),
});

type AirQualitySite = {
  id: string;
  siteName: string;
  siteType: string;
  region: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  pollutant: string;
  averageValue: number | null;
  unit: string | null;
  healthAdvice: string;
};

type RoadDisruption = {
  id: string;
  source: string;
  kind: string;
  status: string;
  roadName: string;
  locality: string;
  eventType: string;
  impactType: string;
  start: string;
  end: string;
  updated: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
};

type AirQualitySelection = {
  scope: "statewide" | "nearest_site";
  sites: AirQualitySite[];
};

type ConstructionYearRecord = {
  censusYear: number | null;
  propertyId: string | null;
  streetAddress: string | null;
  constructionYear: number | null;
  sourceRecordId: number;
};

type ConstructionYearData = {
  kind: "construction_year";
  constructionYear: number;
  pre1990: boolean;
  rule: "pre_1990_construction";
  resolution: "live_api" | "manual_fallback";
  censusYear?: number;
  propertyId?: string;
};

type ConstructionYearLookup =
  | {
      status: "resolved";
      constructionYear: number;
      censusYear: number | null;
      propertyId: string | null;
    }
  | {
      status: "unresolved";
      reason:
        | "no_exact_address_match"
        | "matching_address_has_no_construction_year";
    };

function stringValue(
  value: string | number | null | undefined,
  fallback = "",
): string {
  return value === undefined ? fallback : String(value);
}

function numberValue(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAddress(value: string): string {
  return value
    .toLocaleUpperCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseYear(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const year = Number(value);

  return Number.isInteger(year) ? year : null;
}

function parseConstructionYearRecord(
  record: z.infer<
    typeof buildingInformationResponseSchema
  >["result"]["records"][number],
): ConstructionYearRecord {
  return {
    censusYear: parseYear(record.census_year),
    propertyId: record.property_id ?? null,
    streetAddress: record.street_address ?? null,
    constructionYear: parseYear(record.construction_year),
    sourceRecordId: record._id,
  };
}

function chooseConstructionYearRecord(
  records: ConstructionYearRecord[],
): ConstructionYearRecord | undefined {
  return [...records]
    .filter((record) => record.constructionYear !== null)
    .sort((left, right) => (right.censusYear ?? 0) - (left.censusYear ?? 0))[0];
}

function requireNumber(
  value: number | string | null | undefined,
  field: string,
): number {
  const parsed = numberValue(value);

  if (parsed === null) {
    throw new Error(`EPA AirWatch response is missing numeric ${field}`);
  }

  return parsed;
}

function textMatches(value: string, query: string | undefined): boolean {
  if (!query?.trim()) {
    return true;
  }

  return value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

function distanceSquared(
  latitude: number,
  longitude: number,
  candidate: AirQualitySite,
): number {
  return (
    (candidate.latitude - latitude) ** 2 +
    (candidate.longitude - longitude) ** 2
  );
}

function parseAirQualitySites(
  payload: z.infer<typeof airQualitySiteResponseSchema>,
): AirQualitySite[] {
  if (payload.length === 0) {
    throw new Error("EPA AirWatch response did not contain any site readings");
  }

  return payload.map((value) => ({
    id: value.id,
    siteName: value.siteName,
    siteType: value.siteType,
    region: stringValue(value.region),
    latitude: requireNumber(value.lat, "latitude"),
    longitude: requireNumber(value.lng, "longitude"),
    observedAt: stringValue(value.until, stringValue(value.since)),
    pollutant: stringValue(value.healthParameter),
    averageValue: numberValue(value.averageValue),
    unit: value.unit ?? null,
    healthAdvice: stringValue(value.healthAdvice, "No data"),
  }));
}

function chooseAirQualitySites(
  sites: AirQualitySite[],
  context:
    | {
        latitude?: number;
        longitude?: number;
      }
    | undefined,
): AirQualitySelection {
  const latitude = context?.latitude;
  const longitude = context?.longitude;

  if (latitude === undefined && longitude === undefined) {
    return { scope: "statewide", sites };
  }

  if (latitude === undefined || longitude === undefined) {
    throw new Error(
      "Air Quality location context requires both latitude and longitude",
    );
  }

  const nearestSite = sites.reduce((nearest, site) =>
    distanceSquared(latitude, longitude, site) <
    distanceSquared(latitude, longitude, nearest)
      ? site
      : nearest,
  );

  return { scope: "nearest_site", sites: [nearestSite] };
}

async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
  headers?: HeadersInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }

    return schema.parse(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupConstructionYear(
  address: string,
): Promise<ConstructionYearLookup> {
  const url = new URL(BUILDING_INFORMATION_DATASTORE_URL);

  url.searchParams.set("resource_id", BUILDING_INFORMATION_RESOURCE_ID);
  url.searchParams.set("limit", "100");
  url.searchParams.set("q", address);

  // IMPORTANT COVERAGE LIMITATION: this is City of Melbourne's CLUE dataset,
  // not a statewide Victorian building register or complete property database.
  const payload = await fetchJson(
    url.toString(),
    buildingInformationResponseSchema,
  );

  const normalizedInput = normalizeAddress(address);

  const matchingRecords = payload.result.records
    .map(parseConstructionYearRecord)
    .filter(
      (record) =>
        normalizeAddress(record.streetAddress ?? "") === normalizedInput,
    );

  const selectedRecord = chooseConstructionYearRecord(matchingRecords);

  if (selectedRecord && selectedRecord.constructionYear !== null) {
    return {
      status: "resolved",
      constructionYear: selectedRecord.constructionYear,
      censusYear: selectedRecord.censusYear,
      propertyId: selectedRecord.propertyId,
    };
  }

  return {
    status: "unresolved",
    reason:
      matchingRecords.length === 0
        ? "no_exact_address_match"
        : "matching_address_has_no_construction_year",
  };
}

async function resolveAirQuality(
  context:
    | {
        latitude?: number;
        longitude?: number;
      }
    | undefined,
): Promise<{
  data: {
    kind: "air_quality";
    scope: "statewide" | "nearest_site";
    siteCount: number;
    sites: AirQualitySite[];
  };
  source: string;
}> {
  const payload = await fetchJson(
    EPA_AIR_SITES_URL,
    airQualitySiteResponseSchema,
  );

  const sites = parseAirQualitySites(payload);
  const selected = chooseAirQualitySites(sites, context);

  return {
    data: {
      kind: "air_quality",
      scope: selected.scope,
      siteCount: selected.sites.length,
      sites: selected.sites,
    },
    source: EPA_AIR_SITES_URL,
  };
}

function parseRoadDisruption(
  key: string,
  value: z.infer<typeof roadDisruptionResponseSchema>,
): RoadDisruption {
  const location = Array.isArray(value.location) ? value.location : [];

  return {
    id: stringValue(value.id, key),
    source: stringValue(value.source, "unknown"),
    kind: stringValue(value.kind, "unknown"),
    status: stringValue(value.status, "unknown"),
    roadName: stringValue(value.closedRoadName),
    locality: stringValue(value.startIntersectionLocality),
    eventType: stringValue(value.eventType),
    impactType: stringValue(value.impactType),
    start: stringValue(value.start),
    end: stringValue(value.end),
    updated: stringValue(value.updated),
    description: stringValue(value.description),
    latitude: numberValue(location[1]),
    longitude: numberValue(location[0]),
  };
}

function isVictorianDisruption(disruption: RoadDisruption): boolean {
  const { latitude, longitude } = disruption;

  if (
    latitude === null ||
    longitude === null ||
    latitude < -39.2 ||
    latitude > -33.9 ||
    longitude < 140.9 ||
    longitude > 149.1
  ) {
    return false;
  }

  // The public VicTraffic feed includes interstate feeds. These are the
  // current Victorian publisher/source values; the geographic check above
  // protects against records from neighbouring states near the border.
  return ["DPF", "MTIA", "OneView", "RID", "RWE"].includes(disruption.source);
}

function isClosureLike(disruption: RoadDisruption): boolean {
  const text = [
    disruption.roadName,
    disruption.eventType,
    disruption.impactType,
    disruption.description,
  ]
    .join(" ")
    .toLocaleLowerCase();

  return text.includes("clos") || text.includes("road restriction");
}

async function fetchVicTrafficDisruptions(): Promise<{
  snapshotAt: string;
  disruptions: RoadDisruption[];
}> {
  const items = new Map<string, RoadDisruption>();
  let cursor = "0";
  let snapshotAt = "";

  for (let page = 0; page < 15; page += 1) {
    const url = new URL(VICTRAFFIC_DISRUPTIONS_URL);
    url.searchParams.set("baselineId", "0");
    url.searchParams.set("lastSeenId", "0");
    url.searchParams.set("cursor", cursor);

    const payload = await fetchJson(url.toString(), vicTrafficResponseSchema);

    snapshotAt = stringValue(payload.state.ts, snapshotAt);

    for (const [key, value] of Object.entries(payload.state.items)) {
      const disruption = parseRoadDisruption(key, value.data);

      if (isVictorianDisruption(disruption) && isClosureLike(disruption)) {
        items.set(disruption.id, disruption);
      }
    }

    const nextCursor = payload.meta.cursor;

    if (nextCursor === "-1" || nextCursor === cursor) {
      break;
    }

    cursor = nextCursor;

    if (page === 14) {
      throw new Error("VicTraffic pagination exceeded the bounded page limit");
    }
  }

  return {
    snapshotAt:
      snapshotAt !== "" ? new Date(Number(snapshotAt)).toISOString() : "",
    disruptions: [...items.values()],
  };
}

async function resolveRoadClosures(
  context:
    | {
        roadName?: string;
        locality?: string;
      }
    | undefined,
): Promise<{
  data: {
    kind: "road_closures";
    scope: "statewide" | "location_filtered";
    snapshotAt: string;
    matchCount: number;
    records: RoadDisruption[];
  };
  source: string;
}> {
  const { snapshotAt, disruptions } = await fetchVicTrafficDisruptions();

  const filtered = disruptions.filter(
    (disruption) =>
      textMatches(disruption.roadName, context?.roadName) &&
      textMatches(disruption.locality, context?.locality),
  );

  return {
    data: {
      kind: "road_closures",
      scope:
        context?.roadName?.trim() || context?.locality?.trim()
          ? "location_filtered"
          : "statewide",
      snapshotAt,
      matchCount: filtered.length,
      records: filtered.slice(0, 100),
    },
    source: VICTRAFFIC_DISRUPTIONS_URL,
  };
}

function unresolvedResult(
  id: number | string,
  reason: string,
  attemptedSource: string,
) {
  return {
    id,
    status: "unresolved" as const,
    data: {
      kind: "unresolved" as const,
      reason,
      attemptedSource,
    },
    source: attemptedSource,
  };
}

function resolveManualConstructionYear(
  id: number | string,
  constructionYear: number,
) {
  if (
    !Number.isInteger(constructionYear) ||
    constructionYear < 1800 ||
    constructionYear > new Date().getUTCFullYear()
  ) {
    return unresolvedResult(
      id,
      "construction_year_must_be_a_valid_past_year",
      "deterministic:construction-year-fallback",
    );
  }

  return {
    id,
    status: "resolved" as const,
    data: {
      kind: "construction_year" as const,
      constructionYear,
      pre1990: constructionYear < 1990,
      rule: "pre_1990_construction" as const,
      resolution: "manual_fallback" as const,
    },
    source: "deterministic:construction-year-fallback",
  };
}

async function resolveConstructionYear(
  item: {
    id: number | string;
    context?: {
      constructionYear?: number;
    };
  },
  jobAddress: string | undefined,
) {
  const manualConstructionYear = item.context?.constructionYear;
  let liveLookupFailure: string | undefined;

  if (jobAddress) {
    try {
      const lookup = await lookupConstructionYear(jobAddress);

      if (lookup.status === "resolved") {
        const data: ConstructionYearData = {
          kind: "construction_year",
          constructionYear: lookup.constructionYear,
          pre1990: lookup.constructionYear < 1990,
          rule: "pre_1990_construction",
          resolution: "live_api",
        };

        if (lookup.censusYear !== null) {
          data.censusYear = lookup.censusYear;
        }

        if (lookup.propertyId !== null) {
          data.propertyId = lookup.propertyId;
        }

        return {
          id: item.id,
          status: "resolved" as const,
          data,
          source: BUILDING_INFORMATION_DATASTORE_URL,
        };
      }

      liveLookupFailure = lookup.reason;
    } catch (error) {
      liveLookupFailure =
        error instanceof Error ? error.message : "unknown_error";

      console.warn("[Construction year live lookup failed]", {
        address: jobAddress,
        reason: liveLookupFailure,
        source: BUILDING_INFORMATION_DATASTORE_URL,
      });
    }
  }

  if (manualConstructionYear !== undefined) {
    if (liveLookupFailure) {
      console.warn("[Construction year manual fallback]", {
        address: jobAddress ?? null,
        id: item.id,
        reason: liveLookupFailure,
      });
    }

    return resolveManualConstructionYear(item.id, manualConstructionYear);
  }

  return unresolvedResult(
    item.id,
    liveLookupFailure ??
      "property_address_required_for_building_information_lookup",
    BUILDING_INFORMATION_DATASTORE_URL,
  );
}

async function resolveChecklistItem(
  item: {
    id: number | string;
    item: string;
    context?: {
      constructionYear?: number;
      latitude?: number;
      longitude?: number;
      roadName?: string;
      locality?: string;
    };
  },
  jobAddress: string | undefined,
) {
  const itemText = item.item.trim().toLocaleLowerCase();

  if (itemText.includes("construction year")) {
    return await resolveConstructionYear(item, jobAddress);
  }

  if (itemText.includes("air quality")) {
    try {
      const result = await resolveAirQuality(item.context);

      return { id: item.id, status: "resolved" as const, ...result };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";

      console.warn("[Automated Check unresolved]", {
        id: item.id,
        reason,
        source: EPA_AIR_SITES_URL,
      });

      return unresolvedResult(item.id, reason, EPA_AIR_SITES_URL);
    }
  }

  if (itemText.includes("road closure")) {
    try {
      const result = await resolveRoadClosures(item.context);

      return { id: item.id, status: "resolved" as const, ...result };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";

      console.warn("[Automated Check unresolved]", {
        id: item.id,
        reason,
        source: VICTRAFFIC_DISRUPTIONS_URL,
      });

      return unresolvedResult(item.id, reason, VICTRAFFIC_DISRUPTIONS_URL);
    }
  }

  return unresolvedResult(
    item.id,
    "automated_item_has_no_A3_1_resolver",
    "none",
  );
}

export const resolveAutomatedChecklistItems = action({
  args: {
    address: v.optional(v.string()),
    checklist: v.array(checklistItemValidator),
  },
  returns: v.array(automatedCheckResultValidator),
  handler: async (_ctx, args) => {
    if (args.checklist.length === 0) {
      throw new Error("checklist must contain at least one automated item");
    }

    const ids = new Set<string>();

    for (const item of args.checklist) {
      const id = String(item.id);

      if (ids.has(id)) {
        throw new Error(`Checklist item id must be unique: ${id}`);
      }

      ids.add(id);

      if (!item.item.trim()) {
        throw new Error(`Checklist item ${id} must have nonblank text`);
      }
    }

    const jobAddress = args.address?.trim() || undefined;

    return await Promise.all(
      args.checklist.map((item) => resolveChecklistItem(item, jobAddress)),
    );
  },
});
