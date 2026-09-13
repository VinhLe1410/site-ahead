import { execFile as execFileCallback } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import { LangfuseAPIClient } from "@langfuse/core";

const execFile = promisify(execFileCallback);

const repoRoot = new URL("..", import.meta.url);

const timeoutMs = 30_000;

const pollIntervalMs = 2_000;

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

async function runConvex(functionName, args) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  const { stdout, stderr } = await execFile(
    npmCommand,
    ["exec", "--", "convex", "run", functionName, JSON.stringify(args)],
    {
      cwd: repoRoot,
      env: { ...process.env, NO_COLOR: "1" },
      maxBuffer: 1024 * 1024,
    },
  );

  if (stderr.trim()) {
    process.stderr.write(stderr);
  }

  return stdout.trim() === "" ? null : parseConvexResult(stdout);
}

function verifyClassificationResult(result, fixture) {
  const sampleChecklist = fixture.items.filter(
    (item) => item.status === "pending",
  );

  if (!Array.isArray(result.classifications)) {
    throw new Error("Classification response did not contain an array");
  }

  if (result.classifications.length !== sampleChecklist.length) {
    throw new Error(
      `Expected ${sampleChecklist.length} classifications, received ${result.classifications.length}`,
    );
  }

  if (result.failures.length > 0) {
    throw new Error(
      `Sample classification used fallback handling: ${JSON.stringify(result.failures)}`,
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
    const actualCategory = actualById.get(String(item._id));

    if (!allowedCategories.has(actualCategory)) {
      throw new Error(
        `Item ${item._id} returned unsupported category ${actualCategory ?? "missing"}`,
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
    (observation) =>
      observation.traceName === traceName && hasTokenUsage(observation),
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

  await execFile(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "test:classification-fallback"],
    { cwd: repoRoot },
  );
  const fixture = await runConvex("agents/checklist/verification:prepare", {});
  let result;

  try {
    result = verifyClassificationResult(
      await runConvex(
        "agents/checklist/itemResolutionClassifier:classifyChecklistItems",
        { items: fixture.items, initiatedBy: fixture.initiatedBy },
      ),
      fixture,
    );

    const saved = await runConvex("agents/checklist/verification:inspect", {
      jobId: fixture.items[0].jobId,
    });

    const done = fixture.items.find((item) => item.status === "done");
    const savedDone = saved.items.find((item) => item._id === done._id);

    if (JSON.stringify(savedDone) !== JSON.stringify(done))
      throw new Error("Classification changed a done item");

    if (saved.states.some((state) => state.threadId !== undefined))
      throw new Error("Classification created an execution thread");

    if (
      !saved.states.every(
        (state) =>
          state.classification.traceId === result.traceId &&
          state.classification.status === "succeeded",
      )
    )
      throw new Error("Classification state did not retain the real trace ID");

    for (const classification of result.classifications) {
      const item = saved.items.find((entry) => entry._id === classification.id);

      if (
        item?.kind !== classification.category ||
        item?.status !== "pending" ||
        item?.notes !== "Verification note"
      )
        throw new Error("Saved classification did not preserve item state");
    }
  } finally {
    await runConvex("agents/checklist/verification:cleanup", {
      organizationId: fixture.organizationId,
      initiatedBy: fixture.initiatedBy,
    });
  }

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

      if (traceId !== result.traceId)
        throw new Error("Saved trace ID differs from exported Langfuse trace");

      console.log(
        JSON.stringify(
          {
            classifications: result.classifications,
            failures: result.failures,
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
