# A3.1 automated-check verification

This note records the live source checks used by `convex/agents/checklist/automatedChecks.ts`. The six-item A2 demo sample retains item IDs 1, 2, 3, 4, 6, and 7; item 5 (`Powerlines`) is not part of this demo sample. A2 classified only items 1, 3, and 4 as `automated`; the other three items remain out of scope for this A3.1 action.

## Resolver mapping

| Item | Resolver | Context behavior |
| --- | --- | --- |
| 1. Construction year | City of Melbourne Building Information CKAN API | Uses the job-level address for an exact normalized match; the live response returned construction year 1940 for the committed East Melbourne test address. |
| 3. Air Quality | EPA Victoria AirWatch public monitoring-site feed | Returns the current statewide site readings, or the nearest site when latitude and longitude are supplied. |
| 4. Road Closure | Official VicTraffic public disruption feed | Returns current Victorian closure-like disruptions, optionally filtered by road name or locality. |

Every action result uses the common outer shape `{ id, status, data, source }`. External JSON is parsed against a schema before it is normalized. API failures and unexpected response shapes return `unresolved` with a visible reason.

## Live feed evidence

Captured at `2026-09-13T08:54:21Z` with Node.js 24. These are real responses from the same public feeds used by the action; no fixtures or fake API responses were used.

The end-to-end Convex verification ran at `2026-09-13T09:51:05.926Z` against the six-item sample and the synced development deployment.

### Building Information — item 1

> Coverage warning: this is City of Melbourne's CLUE dataset, not a statewide Victorian building register or complete property database. An address outside its coverage can remain unresolved even when the property exists.

Request: `GET https://discover.data.vic.gov.au/api/3/action/datastore_search?resource_id=541d923d-a458-492a-88c2-edd8a3aaf85b&limit=100&q=80+Wellington+Parade%2C+East+Melbourne+3002`

```json
{
  "httpStatus": 200,
  "total": 21,
  "exactAddressMatches": 18,
  "propertyId": "110007",
  "selectedCensusYear": 2019,
  "constructionYear": 1940,
  "pre1990": true
}
```

The negative test used `9999 No Such Street MELBOURNE 3000`; the API returned HTTP 200 with zero records and the action returned `unresolved` with reason `no_exact_address_match`. Supplying `context.constructionYear: 1985` for that same missing address used the explicit manual fallback and returned `pre1990: true`.

### EPA AirWatch — item 3

Request: `GET https://www.epa.vic.gov.au/api/environment/air/sites`

```json
{
  "httpStatus": 200,
  "siteCount": 90,
  "firstSite": {
    "siteName": "Alphington",
    "observedAt": "2026-09-13T08:00:00Z",
    "pollutant": "PM2.5",
    "averageValue": 2.8,
    "unit": "&micro;g/m&sup3;",
    "healthAdvice": "Good"
  }
}
```

### VicTraffic — item 4

Request: `GET https://api.traffic.transport.vic.gov.au/disruptions?baselineId=0&lastSeenId=0&cursor=0`

```json
{
  "httpStatus": 200,
  "snapshotAt": "1789275834522",
  "pageItemCount": 2000,
  "reportedTotal": 18112,
  "firstParsedDisruption": {
    "id": "RID-RUD-INC1001977_RUD-IMP1001978",
    "source": "RID",
    "kind": "Unplanned",
    "status": "Active",
    "closedRoadName": "BREAKAWAY ROAD",
    "impactType": "Road Closed",
    "location": [145.71115686651058, -37.23940361355572]
  }
}
```

## Convex verification

`npm run verify:classification` passed with six classifications, no fallbacks, and no unknown IDs. `npm run verify:automated-checks` passed against the six-item sample: construction year resolved through the live API, Air Quality returned 90 parsed sites, Road Closure returned parsed live disruptions, the three non-automated items stayed unresolved, the nonexistent address returned `no_exact_address_match`, and the explicit manual fallback resolved 1985.
