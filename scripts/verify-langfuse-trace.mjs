import { execFile as execFileCallback } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import { LangfuseAPIClient } from "@langfuse/core";

const execFile = promisify(execFileCallback);

const repoRoot = new URL("..", import.meta.url);

const timeoutMs = 30_000;

const pollIntervalMs = 2_000;

const traceNamePrefix = "site-ahead-observability-smoke";

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

async function runSmokeTest(smokeTestId) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  const { stdout, stderr } = await execFile(
    npmCommand,
    [
      "exec",
      "--",
      "convex",
      "run",
      "agents/shared/observabilitySmokeTest:runObservabilitySmokeTest",
      JSON.stringify({ smokeTestId }),
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

async function findTrace(client, traceName, startedAt) {
  const response = await client.observations.getMany(
    {
      fields: "core,basic,io,metadata,model,usage,trace_context",
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

  if (!hasTokenUsage(matchingObservation)) {
    return { observation: matchingObservation, usageReady: false };
  }

  return { observation: matchingObservation, usageReady: true };
}

async function main() {
  const publicKey = requireEnvironmentVariable("LANGFUSE_PUBLIC_KEY");
  const secretKey = requireEnvironmentVariable("LANGFUSE_SECRET_KEY");

  const baseUrl = requireEnvironmentVariable("LANGFUSE_BASE_URL").replace(
    /\/$/,
    "",
  );

  const smokeTestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const traceName = `${traceNamePrefix}-${smokeTestId}`;
  const startedAt = new Date(Date.now() - 2_000).toISOString();

  const client = new LangfuseAPIClient({
    environment: baseUrl,
    baseUrl,
    username: publicKey,
    password: secretKey,
  });

  const convexResult = await runSmokeTest(smokeTestId);

  if (convexResult.smokeTestId !== smokeTestId) {
    throw new Error(
      "Convex smoke-test response did not contain the requested run marker",
    );
  }

  const deadline = Date.now() + timeoutMs;
  let traceResult = null;

  while (Date.now() < deadline) {
    traceResult = await findTrace(client, traceName, startedAt);

    if (traceResult?.usageReady) {
      const traceId = traceResult.observation.traceId;
      const verifiedAt = new Date().toISOString();
      const usage = traceResult.observation.usageDetails;

      console.log(
        JSON.stringify(
          {
            traceId,
            traceName,
            uiUrl: `${baseUrl}/trace/${traceId}`,
            usage,
            verifiedAt,
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
    `No Langfuse trace named ${traceName} found within ${timeoutMs}ms`,
  );
}

main().catch((error) => {
  console.error(`Langfuse smoke-test verification failed: ${error.message}`);
  process.exitCode = 1;
});
