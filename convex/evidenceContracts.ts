import { v } from "convex/values";
import {
  electricalFindingValidator,
  simulatedDeliveryFindingValidator,
} from "./electricalContracts";

export const constructionFindingValidator = v.object({
  kind: v.literal("construction_year"),
  summary: v.string(),
  observedAt: v.number(),
  address: v.string(),
  constructionYear: v.number(),
  pre1990: v.boolean(),
  resolution: v.union(v.literal("live_api"), v.literal("manual_fallback")),
  lookupOutcome: v.union(
    v.literal("exact_match"),
    v.literal("no_exact_address_match"),
    v.literal("matching_address_has_no_construction_year"),
  ),
  censusYear: v.optional(v.number()),
  propertyId: v.optional(v.string()),
  sourceRecordId: v.optional(v.number()),
  coverage: v.string(),
});

export const airFindingValidator = v.object({
  kind: v.literal("air_quality"),
  summary: v.string(),
  observedAt: v.number(),
  fetchedAt: v.number(),
  scope: v.literal("nearby_monitoring_station"),
  siteLatitude: v.number(),
  siteLongitude: v.number(),
  stationId: v.string(),
  stationName: v.string(),
  stationLatitude: v.number(),
  stationLongitude: v.number(),
  distanceKm: v.number(),
  value: v.number(),
  unit: v.string(),
  pollutant: v.string(),
  sourceAdvice: v.string(),
  coverageRadiusKm: v.number(),
  maxReadingAgeHours: v.number(),
  coverage: v.string(),
});

export const roadRecordValidator = v.object({
  id: v.string(),
  source: v.string(),
  roadName: v.string(),
  locality: v.string(),
  eventType: v.string(),
  impactType: v.string(),
  status: v.string(),
  start: v.string(),
  end: v.string(),
  updatedAt: v.number(),
  description: v.string(),
  latitude: v.number(),
  longitude: v.number(),
});

export const roadFindingValidator = v.object({
  kind: v.literal("road_closures"),
  summary: v.string(),
  observedAt: v.number(),
  fetchedAt: v.number(),
  scope: v.literal("exact_road_and_locality"),
  roadName: v.string(),
  locality: v.string(),
  completeSnapshot: v.literal(true),
  matchCount: v.number(),
  records: v.array(roadRecordValidator),
  maxSnapshotAgeHours: v.number(),
  coverage: v.string(),
});

export const agentFindingValidator = v.union(
  electricalFindingValidator,
  simulatedDeliveryFindingValidator,
  constructionFindingValidator,
  airFindingValidator,
  roadFindingValidator,
);
