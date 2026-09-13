import { execFile as execFileCallback } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import { LangfuseAPIClient } from "@langfuse/core";

const execFile = promisify(execFileCallback);

const repoRoot = new URL("..", import.meta.url);

const timeoutMs = 30_000;

const pollIntervalMs = 2_000;

const sampleChecklist = [
  { id: 1, item: "Construction year of the property (pre/post 1990)" },
  { id: 2, item: "Asbestos disturbance assessment" },
  { id: 3, item: "Air Quality" },
  { id: 4, item: "Road Closure" },
  { id: 5, item: "Powerlines" },
  { id: 6, item: "Building permit + registered building surveyor appointed" },
  {
    id: 7,
    item: "Occupancy Permit / Certificate of Final Inspection on completion",
  },
];

const allowedCategories = new Set(["automated", "third_party", "on_site"]);

try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

function requireEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function hasTokenUsage(observation) {
  const usageDetails = observation.usageDetails ?? {};

  const usageValues = Object.values(usageDetails).filter((value) =>
    Number.isFinite(value),
  );

  return usageValues.some((value) => value > 0);
}

function parseConvexResult(stdout) {
  const trimmedOutput = stdout.trim();

  try {
    return JSON.parse(trimmedOutput);
  } catch {
    const jsonStart = trimmedOutput.indexOf("{");
    const jsonEnd = trimmedOutput.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error(`Convex returned non-JSON output:\n${trimmedOutput}`);
    }

    return JSON.parse(trimmedOutput.slice(jsonStart, jsonEnd + 1));
  }
}

async function runClassification() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  const { stdout, stderr } = await execFile(
    npmCommand,
    [
      "exec",
      "--",
      "convex",
      "run",
      "agents/checklist/itemResolutionClassifier:classifyChecklistItems",
      JSON.stringify({
        job_type: "Carpentry & Renovation",
        checklist: sampleChecklist,
      }),
      "--typecheck",
      "disable",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, NO_COLOR: "1" },
      maxBuffer: 1024 * 1024,
    },
  );

  if (stderr.trim()) {
    process.stderr.write(stderr);
  }

  return parseConvexResult(stdout);
}

function verifyClassificationResult(result) {
  if (!Array.isArray(result.classifications)) {
    throw new Error("Classification response did not contain an array");
  }

  if (result.classifications.length !== sampleChecklist.length) {
    throw new Error(
      `Expected ${sampleChecklist.length} classifications, received ${result.classifications.length}`,
    );
  }

  if (result.fallbacks.length > 0) {
    throw new Error(
      `Sample classification used fallback handling: ${JSON.stringify(result.fallbacks)}`,
    );
  }

  if (result.unknownModelItemIds.length > 0) {
    throw new Error(
      `Model returned unknown item ids: ${JSON.stringify(result.unknownModelItemIds)}`,
    );
  }

  const actualById = new Map(
    result.classifications.map((classification) => [
      String(classification.id),
      classification.category,
    ]),
  );

  if (actualById.size !== sampleChecklist.length) {
    throw new Error(
      "Classification response contained duplicate or missing item ids",
    );
  }

  for (const item of sampleChecklist) {
    const actualCategory = actualById.get(String(item.id));

    if (!allowedCategories.has(actualCategory)) {
      throw new Error(
        `Item ${item.id} returned unsupported category ${actualCategory ?? "missing"}`,
      );
    }
  }

  return result;
}

async function findTrace(client, traceName, startedAt) {
  const response = await client.observations.getMany(
    {
      fields: "core,basic,metadata,usage,trace_context",
      filter: JSON.stringify([
        {
          type: "string",
          column: "traceName",
          operator: "=",
          value: traceName,
        },
      ]),
      fromStartTime: startedAt,
      limit: 100,
    },
    { maxRetries: 0, timeoutInSeconds: 3 },
  );

  const observations = Array.isArray(response.data)
    ? response.data
    : (response.data?.data ?? []);

  const matchingObservation = observations.find(
    (observation) => observation.traceName === traceName,
  );

  if (!matchingObservation?.traceId) {
    return null;
  }

  return {
    observation: matchingObservation,
    usageReady: hasTokenUsage(matchingObservation),
  };
}

async function main() {
  const publicKey = requireEnvironmentVariable("LANGFUSE_PUBLIC_KEY");
  const secretKey = requireEnvironmentVariable("LANGFUSE_SECRET_KEY");

  const baseUrl = requireEnvironmentVariable("LANGFUSE_BASE_URL").replace(
    /\/$/,
    "",
  );

  const startedAt = new Date(Date.now() - 2_000).toISOString();

  const client = new LangfuseAPIClient({
    environment: baseUrl,
    baseUrl,
    username: publicKey,
    password: secretKey,
  });

  const result = verifyClassificationResult(await runClassification());

  if (!result.traceName) {
    throw new Error(
      "Classification response did not include its Langfuse trace name",
    );
  }

  const deadline = Date.now() + timeoutMs;
  let traceResult = null;

  while (Date.now() < deadline) {
    traceResult = await findTrace(client, result.traceName, startedAt);

    if (traceResult?.usageReady) {
      const traceId = traceResult.observation.traceId;

      console.log(
        JSON.stringify(
          {
            classifications: result.classifications,
            fallbacks: result.fallbacks,
            traceId,
            traceName: result.traceName,
            uiUrl: `${baseUrl}/trace/${traceId}`,
            usage: traceResult.observation.usageDetails,
            verifiedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );

      return;
    }

    await sleep(pollIntervalMs);
  }

  if (traceResult?.observation?.traceId) {
    throw new Error(
      `Found Langfuse trace ${traceResult.observation.traceId}, but token usage was not available within ${timeoutMs}ms`,
    );
  }

  throw new Error(
    `No Langfuse trace named ${result.traceName} found within ${timeoutMs}ms`,
  );
}

main().catch((error) => {
  console.error(
    `Checklist classification verification failed: ${error.message}`,
  );
  process.exitCode = 1;
});
