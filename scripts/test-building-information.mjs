import process from "node:process";

const DATASTORE_SEARCH_URL =
  "https://discover.data.vic.gov.au/api/3/action/datastore_search";

const RESOURCE_ID = "541d923d-a458-492a-88c2-edd8a3aaf85b";

const DEFAULT_ADDRESS = "80 Wellington Parade, East Melbourne 3002";

function normalizeAddress(value) {
  return value
    .toLocaleUpperCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseYear(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const year = Number(value);

  return Number.isInteger(year) ? year : null;
}

function projectRecord(record) {
  return {
    censusYear: parseYear(record.census_year),
    propertyId: record.property_id ?? null,
    streetAddress: record.street_address ?? null,
    constructionYear: parseYear(record.construction_year),
    refurbishedYear: parseYear(record.refurbished_year),
    sourceRecordId: record._id ?? null,
  };
}

function chooseConstructionRecord(records) {
  return [...records]
    .filter((record) => record.constructionYear !== null)
    .sort((left, right) => (right.censusYear ?? 0) - (left.censusYear ?? 0))[0];
}

async function main() {
  const address = process.argv.slice(2).join(" ").trim() || DEFAULT_ADDRESS;
  const url = new URL(DATASTORE_SEARCH_URL);

  url.searchParams.set("resource_id", RESOURCE_ID);
  url.searchParams.set("limit", "100");
  url.searchParams.set("q", address);

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || payload.success !== true || !payload.result) {
    throw new Error(
      `Building Information API request failed (${response.status}): ${JSON.stringify(payload)}`,
    );
  }

  const records = Array.isArray(payload.result.records)
    ? payload.result.records
    : [];

  const normalizedInput = normalizeAddress(address);

  const matchingRecords = records
    .map(projectRecord)
    .filter(
      (record) =>
        normalizeAddress(record.streetAddress ?? "") === normalizedInput,
    );

  const selectedRecord = chooseConstructionRecord(matchingRecords);

  const result = {
    testedAt: new Date().toISOString(),
    endpoint: url.toString(),
    input: { address },
    apiResponse: {
      httpStatus: response.status,
      success: payload.success,
      total: payload.result.total,
      returnedRecords: records.length,
      fields: payload.result.fields,
    },
    exactAddressMatches: matchingRecords,
    normalizedResult: selectedRecord
      ? {
          id: "building-information-probe",
          status: "resolved",
          data: {
            kind: "construction_year",
            constructionYear: selectedRecord.constructionYear,
            pre1990: selectedRecord.constructionYear < 1990,
            censusYear: selectedRecord.censusYear,
            propertyId: selectedRecord.propertyId,
          },
          source: DATASTORE_SEARCH_URL,
        }
      : {
          id: "building-information-probe",
          status: "unresolved",
          data: {
            kind: "unresolved",
            reason:
              matchingRecords.length === 0
                ? "no_exact_address_match"
                : "matching_address_has_no_construction_year",
          },
          source: DATASTORE_SEARCH_URL,
        },
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    `[Building Information probe failed] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
