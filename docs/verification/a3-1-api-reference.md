# A3.1 automated-check API reference

This reference describes the resolvers currently wired in `convex/agents/checklist/automatedChecks.ts`. The six-item A2 demo sample retains item IDs 1, 2, 3, 4, 6, and 7; item 5 (`Powerlines`) was removed from the demo sample without renumbering. A3.1 resolves the items A2 classified as `automated`: item 1, item 3, and item 4.

## Resolver reference

### City of Melbourne Building Information CKAN API

- Name: City of Melbourne Building Information dataset through the DataVic CKAN datastore API.
- Confirmed working: Yes. The production Convex action returned a real match for `80 Wellington Parade, East Melbourne 3002`: property ID `110007`, construction year `1940`, and census year `2019`.
- Resolves: item 1, `Construction year of the property (pre/post 1990)`.
- Coverage: City of Melbourne CLUE data only; this is not statewide coverage and is not a complete Victorian property database.
- Endpoint: [`https://discover.data.vic.gov.au/api/3/action/datastore_search`](https://discover.data.vic.gov.au/api/3/action/datastore_search).
- Raw input required by the API:
  - `GET` request with `resource_id=541d923d-a458-492a-88c2-edd8a3aaf85b`.
  - `limit=100` and `q=<address>` are sent to the CKAN datastore search endpoint.
  - No API key or special request header is used by this public resource.
- Input currently passed by this codebase:
  - The Convex action accepts an optional job-level `address` alongside the checklist.
  - The address is sent as `q`; the returned records are then compared using exact normalization: uppercase, punctuation removal for periods/commas, whitespace collapse, and trimming.
  - The committed live-success test address is `80 Wellington Parade, East Melbourne 3002`.
  - `context.constructionYear` remains an optional explicit manual fallback. It is used only after no live exact match or a live lookup failure.
- Output:
  - CKAN returns `{ success: boolean, result: { total: number, records: array, fields: array } }`.
  - Relevant record fields are `_id: int`, `street_address: text | null`, `property_id: text | null`, `census_year: text | null`, and `construction_year: text | null`. The live response returned 21 records, including 18 exact normalized address matches.
- Normalized output:
  - Live match: `{ id, status: "resolved", data: { kind: "construction_year", constructionYear: number, pre1990: boolean, rule: "pre_1990_construction", resolution: "live_api", censusYear?: number, propertyId?: string }, source: "https://discover.data.vic.gov.au/api/3/action/datastore_search" }`.
  - The no-match test returns `{ id, status: "unresolved", data: { kind: "unresolved", reason: "no_exact_address_match", attemptedSource }, source }`.
  - Explicit manual fallback returns the same construction-year data with `resolution: "manual_fallback"` and source `deterministic:construction-year-fallback`.

### EPA Victoria AirWatch monitoring-site feed

- Name: EPA Victoria AirWatch public monitoring-site feed.
- Confirmed working: Yes. A real request returned HTTP 200 with 90 site readings; the captured response is recorded in [the A3.1 verification evidence](./a3-1-automated-checks.md).
- Resolves: item 3, `Air Quality`.
- Endpoint: [`https://www.epa.vic.gov.au/api/environment/air/sites`](https://www.epa.vic.gov.au/api/environment/air/sites).
- Raw input required by the endpoint:
  - `GET` request.
  - No query parameters or request headers are currently required by the public endpoint.
  - The endpoint returns current AirWatch site data; the response observed during verification included hourly timestamps.
- Input currently passed by this codebase:
  - The action sends a plain `GET` with no headers or query parameters.
  - Without location context, it uses every returned site and labels the result `scope: "statewide"`.
  - If the item includes both optional `context.latitude` and `context.longitude` numbers, the code still makes the same request and selects the nearest returned site, labeling the result `scope: "nearest_site"`.
  - A partial latitude/longitude pair is rejected as unresolved; no geocoding or region code is sent to EPA.
- Raw output observed:
  - Top-level JSON array.
  - Each observed site object contains `siteName: string`, `siteType: string`, `id: string`, `lat: number`, `lng: number`, `since: ISO timestamp string`, `until: ISO timestamp string`, `averageValue: number | null`, `unit: string | null`, `healthParameter: string | null`, `healthAdvice: string`, `parameters: object`, and `region: string`.
  - `parameters` is keyed by strings such as `PM2.5|1HR_AV`; each value is an array of readings containing fields such as `since`, `until`, `averageValue`, `unit`, `healthAdvice`, `paramName`, and `timeSeries`.
- Normalized output:
  - `{ id, status: "resolved", data: { kind: "air_quality", scope, siteCount: number, sites: [...] }, source: "https://www.epa.vic.gov.au/api/environment/air/sites" }`.
  - Each normalized site keeps `id`, `siteName`, `siteType`, `region`, `latitude`, `longitude`, `observedAt`, `pollutant`, `averageValue`, `unit`, and `healthAdvice`.
  - The nested raw `parameters` object is intentionally not returned.
  - HTTP failures or a response that does not match the expected schema return a visible `unresolved` result.

### Official VicTraffic public disruption feed

- Name: official VicTraffic public disruption feed.
- Confirmed working: Yes. A real request returned HTTP 200, a 2,000-item page, and a reported total of 18,112 disruptions; the captured response is recorded in [the A3.1 verification evidence](./a3-1-automated-checks.md).
- Resolves: item 4, `Road Closure`.
- Endpoint: [`https://api.traffic.transport.vic.gov.au/disruptions`](https://api.traffic.transport.vic.gov.au/disruptions).
- Raw input required by the endpoint:
  - `GET` request with incremental-feed query parameters `baselineId`, `lastSeenId`, and `cursor`.
  - The initial request uses `baselineId=0`, `lastSeenId=0`, and `cursor=0`.
  - Subsequent requests use the cursor returned by the previous response. No request headers or road-name parameters are currently used.
- Input currently passed by this codebase:
  - It sends the initial three query values above and follows the returned cursor for up to 15 pages.
  - `context.roadName` and `context.locality`, when supplied, are applied after retrieval as case-insensitive substring filters; they are not sent to VicTraffic.
  - With no location context, the action returns the statewide closure-like results it finds in the feed.
- Raw output observed:
  - Root object with `state`, `changes`, and `meta`.
  - `state` contains `ts: number`, `id: string`, and `items: object`.
  - Each `items` value contains `source: string`, `id: string`, `added: number`, `data: object`, and `hash: string`.
  - The observed `data` object includes fields such as `id: string`, `type: string`, `location: [number, number]`, `geolinesSet: string[]`, `isPolygon: boolean`, `kind: string`, `status: string`, `start: string`, `end: string`, `eventType: string`, `eventSubtype: string`, `eventDueTo: string`, `impactType: string`, `source: string`, `closedRoadName: string`, `startIntersectionLocality: string | null`, `updated: string`, `description: string`, and optional direction/region/link fields.
  - `meta` contains `lastSeen: string`, `cursor: string`, `total: number`, and `chunkTotal: number`.
- Normalized output:
  - `{ id, status: "resolved", data: { kind: "road_closures", scope, snapshotAt: string, matchCount: number, records: [...] }, source: "https://api.traffic.transport.vic.gov.au/disruptions" }`.
  - Each normalized record contains `id`, `source`, `kind`, `status`, `roadName`, `locality`, `eventType`, `impactType`, `start`, `end`, `updated`, `description`, `latitude`, and `longitude`.
  - The implementation keeps Victorian records, identifies closure-like records, applies optional location filters, and returns at most 100 normalized records while preserving `matchCount`.
  - HTTP failures, schema failures, and pagination beyond the bounded limit return a visible `unresolved` result.

## Standard result contract

All three resolvers return the same outer shape:

```ts
{
  id: number | string;
  status: "resolved" | "unresolved";
  data: object;
  source: string;
}
```

The `data.kind` discriminator is `construction_year`, `air_quality`, `road_closures`, or `unresolved`.

The EPA documentation describes AirWatch as providing current hourly air-quality information through its environment monitoring API. The Transport Victoria Open Data road-disruption APIs are related official sources, but currently require a `KeyID`; the implementation therefore uses the public VicTraffic feed for this A3.1 slice.
