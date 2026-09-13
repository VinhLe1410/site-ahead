import { execFile as execFileCallback } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const repoRoot = new URL("..", import.meta.url);

const sampleChecklist = [
  { id: 1, item: "Construction year of the property (pre/post 1990)" },
  { id: 2, item: "Asbestos disturbance assessment" },
  { id: 3, item: "Air Quality" },
  { id: 4, item: "Road Closure" },
  {
    id: 6,
    item: "Building permit + registered building surveyor appointed",
  },
  {
    id: 7,
    item: "Occupancy Permit / Certificate of Final Inspection on completion",
  },
];

const sampleAddress = "80 Wellington Parade, East Melbourne 3002";

const missingAddress = "9999 No Such Street MELBOURNE 3000";

function parseConvexResult(stdout) {
  const trimmedOutput = stdout.trim();

  try {
    return JSON.parse(trimmedOutput);
  } catch {
    const jsonStart = trimmedOutput.indexOf("[");
    const jsonEnd = trimmedOutput.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error(`Convex returned non-JSON output:\n${trimmedOutput}`);
    }

    return JSON.parse(trimmedOutput.slice(jsonStart, jsonEnd + 1));
  }
}

async function runAutomatedChecks(checklist, address) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  const { stdout, stderr } = await execFile(
    npmCommand,
    [
      "exec",
      "--",
      "convex",
      "run",
      "agents/checklist/automatedChecks:resolveAutomatedChecklistItems",
      JSON.stringify({ address, checklist }),
      "--typecheck",
      "disable",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, NO_COLOR: "1" },
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (stderr.trim()) {
    process.stderr.write(stderr);
  }

  return parseConvexResult(stdout);
}

function requireResultArray(result, expectedLength) {
  if (!Array.isArray(result) || result.length !== expectedLength) {
    throw new Error(
      `Expected ${expectedLength} automated-check results, received ${Array.isArray(result) ? result.length : "non-array output"}`,
    );
  }

  const ids = new Set(result.map((item) => String(item.id)));

  if (ids.size !== expectedLength) {
    throw new Error("Automated-check response contained duplicate item ids");
  }
}

function summarizeResult(result) {
  return result.map(({ id, status, source, data }) => ({
    id,
    status,
    source,
    kind: data.kind,
    ...(data.kind === "air_quality"
      ? { siteCount: data.siteCount }
      : data.kind === "road_closures"
        ? {
            matchCount: data.matchCount,
            snapshotAt: data.snapshotAt,
          }
        : data.kind === "construction_year"
          ? {
              constructionYear: data.constructionYear,
              pre1990: data.pre1990,
              resolution: data.resolution,
              censusYear: data.censusYear,
              propertyId: data.propertyId,
            }
          : { reason: data.reason }),
  }));
}

function verifySample(result) {
  requireResultArray(result, sampleChecklist.length);

  const byId = new Map(result.map((item) => [String(item.id), item]));
  const constructionYear = byId.get("1");
  const airQuality = byId.get("3");
  const roadClosure = byId.get("4");

  if (
    constructionYear?.status !== "resolved" ||
    constructionYear.data.kind !== "construction_year" ||
    constructionYear.data.resolution !== "live_api" ||
    constructionYear.data.constructionYear !== 1940 ||
    constructionYear.data.pre1990 !== true
  ) {
    throw new Error("Construction year did not resolve from live API data");
  }

  if (
    airQuality?.status !== "resolved" ||
    airQuality.data.kind !== "air_quality" ||
    airQuality.data.siteCount < 1
  ) {
    throw new Error("Air Quality did not return parsed live site data");
  }

  if (
    roadClosure?.status !== "resolved" ||
    roadClosure.data.kind !== "road_closures"
  ) {
    throw new Error("Road Closure did not return parsed live disruption data");
  }

  for (const id of ["2", "6", "7"]) {
    const resultForOutOfScopeItem = byId.get(id);

    if (
      resultForOutOfScopeItem?.status !== "unresolved" ||
      resultForOutOfScopeItem.data.kind !== "unresolved" ||
      resultForOutOfScopeItem.data.reason !==
        "automated_item_has_no_A3_1_resolver"
    ) {
      throw new Error(`Out-of-scope item ${id} was unexpectedly resolved`);
    }
  }
}

function verifyMissingAddress(result) {
  requireResultArray(result, 1);

  const [item] = result;

  if (
    item.id !== 1 ||
    item.status !== "unresolved" ||
    item.data.kind !== "unresolved" ||
    item.data.reason !== "no_exact_address_match"
  ) {
    throw new Error("Missing construction-year address was not unresolved");
  }
}

function verifyManualFallback(result) {
  requireResultArray(result, 1);

  const [item] = result;

  if (
    item.id !== 1 ||
    item.status !== "resolved" ||
    item.data.kind !== "construction_year" ||
    item.data.resolution !== "manual_fallback" ||
    item.data.constructionYear !== 1985 ||
    item.data.pre1990 !== true
  ) {
    throw new Error(
      "Construction-year manual fallback returned an invalid result",
    );
  }
}

async function main() {
  const sampleResult = await runAutomatedChecks(sampleChecklist, sampleAddress);
  verifySample(sampleResult);

  const missingAddressResult = await runAutomatedChecks(
    [
      {
        id: 1,
        item: "Construction year of the property (pre/post 1990)",
      },
    ],
    missingAddress,
  );

  verifyMissingAddress(missingAddressResult);

  const manualFallbackResult = await runAutomatedChecks(
    [
      {
        id: 1,
        item: "Construction year of the property (pre/post 1990)",
        context: { constructionYear: 1985 },
      },
    ],
    missingAddress,
  );

  verifyManualFallback(manualFallbackResult);

  console.log(
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        sample: summarizeResult(sampleResult),
        missingAddress: summarizeResult(missingAddressResult),
        manualFallback: summarizeResult(manualFallbackResult),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    `[A3.1 automated-check verification failed] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
