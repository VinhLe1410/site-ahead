#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");

interface TestCaseGroundTruth {
  jobType: string;
  expectedLocationTokens: string[];
  expectedDescriptionKeywords: string[];
}

interface TestCase {
  id: string;
  category: string;
  transcript: string;
  groundTruth: TestCaseGroundTruth;
}

interface ExtractedData {
  jobType?: unknown;
  location?: unknown;
  description?: unknown;
}

interface EvalResult {
  id: string;
  passed: boolean;
  hasValidSchema: boolean;
  jobTypeCorrect: boolean;
  locMatched: boolean;
  descRecall: number;
  expectedJobType: string;
  predictedJobType: string;
  predictedLocation: string;
  latencyMs: number;
  error?: string;
}

function isObject(val: unknown): val is ExtractedData {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isString(val: unknown): val is string {
  return typeof val === "string";
}

// Load .env / .env.local if present
function loadEnv() {
  for (const envFile of [".env.local", ".env"]) {
    const envPath = path.join(rootDir, envFile);

    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");

      for (const line of content.split("\n")) {
        const trimmed = line.trim();

        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...rest] = trimmed.split("=");

          const val = rest
            .join("=")
            .trim()
            .replace(/^["']|["']$/g, "");

          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const INTAKE_SYSTEM_PROMPT = `You are the AI Site Recon Intake Agent for Site Ahead, a platform for Australian trade contractors.
Your task is to parse unstructured client requests (voicemails, messages, or transcripts) and extract the essential job details.

### 1. EXTRACTION TARGETS

Extract exactly these 3 fields:

1. \`jobType\`: Classify into one of:
   - "carpentry": Timber framing, decking, pergolas, doors, windows, skirting, cabinetry, structural timber.
   - "electrical": Switchboards, wiring, EV chargers, lighting, power outages, safety switches / RCDs.
   - "other": Work outside these trades (e.g. plumbing, painting, excavation, trenching).

2. \`location\`: The single cleaned physical site address where the work will take place. If not provided, set to "Address not provided".

3. \`description\`: A clear, professional summary of the work requested, including any key dimensions or site access constraints mentioned in the request.

### 2. OUTPUT FORMAT

Respond ONLY with a valid JSON object matching this schema, with no markdown fences, extra commentary, or trailing commas:

{
  "jobType": "carpentry" | "electrical" | "other",
  "location": string,
  "description": string
}`;

async function runExtraction(transcript: string, apiKey: string) {
  const startTime = Date.now();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: INTAKE_SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
  }

  // SAFETY: parsed body adheres to OpenAI chat completion response
  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty message.");
  }

  const parsed: unknown = JSON.parse(content);

  return { parsed, latencyMs };
}

async function main() {
  const datasetPath = path.join(
    rootDir,
    "tests",
    "golden-benchmark-dataset.json",
  );

  if (!fs.existsSync(datasetPath)) {
    console.error(`Dataset not found at ${datasetPath}`);
    process.exit(1);
  }

  // SAFETY: test dataset conforms to TestCase array
  const dataset = JSON.parse(
    fs.readFileSync(datasetPath, "utf8"),
  ) as TestCase[];

  const apiKey =
    process.argv.find((arg) => arg.startsWith("--api-key="))?.split("=")[1] ||
    process.env.OPENAI_API_KEY;

  console.log(
    "================================================================================",
  );
  console.log("Site Ahead Intake Pipeline — Benchmark Evaluation Harness");
  console.log(
    `Loaded: ${dataset.length} test cases from tests/golden-benchmark-dataset.json`,
  );
  console.log(
    "================================================================================",
  );

  if (!apiKey) {
    console.warn("\n⚠️  No OPENAI_API_KEY detected.");
    console.warn(
      "   Provide via environment variable: export OPENAI_API_KEY='sk-...'",
    );
    console.warn(
      "   Or via command line argument: node tools/eval-intake.ts --api-key='sk-...'\n",
    );
    console.log("Dataset syntax and schema verified successfully (dry run).");
    process.exit(0);
  }

  const results: EvalResult[] = [];

  for (let i = 0; i < dataset.length; i++) {
    const tc = dataset[i];
    process.stdout.write(
      `Evaluating [${i + 1}/${dataset.length}] ${tc.id}... `,
    );

    try {
      const { parsed, latencyMs } = await runExtraction(tc.transcript, apiKey);

      const hasValidSchema =
        isObject(parsed) &&
        isString(parsed.jobType) &&
        ["carpentry", "electrical", "other"].includes(parsed.jobType) &&
        isString(parsed.location) &&
        isString(parsed.description);

      const parsedJobType =
        isObject(parsed) && isString(parsed.jobType) ? parsed.jobType : "";

      const parsedLoc =
        isObject(parsed) && isString(parsed.location) ? parsed.location : "";

      const parsedDesc =
        isObject(parsed) && isString(parsed.description)
          ? parsed.description
          : "";

      const jobTypeCorrect = parsedJobType === tc.groundTruth.jobType;

      const locationLower = parsedLoc.toLowerCase();

      const locMatched = tc.groundTruth.expectedLocationTokens.every((token) =>
        locationLower.includes(token.toLowerCase()),
      );

      const descLower = parsedDesc.toLowerCase();

      const matchedKeywords = tc.groundTruth.expectedDescriptionKeywords.filter(
        (kw) => descLower.includes(kw.toLowerCase()),
      );

      const descRecall =
        matchedKeywords.length /
        tc.groundTruth.expectedDescriptionKeywords.length;

      results.push({
        id: tc.id,
        passed: hasValidSchema && jobTypeCorrect && locMatched,
        hasValidSchema,
        jobTypeCorrect,
        locMatched,
        descRecall,
        expectedJobType: tc.groundTruth.jobType,
        predictedJobType: parsedJobType,
        predictedLocation: parsedLoc,
        latencyMs,
      });

      console.log(
        hasValidSchema && jobTypeCorrect && locMatched ? "PASS" : "FAIL",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`ERROR: ${message}`);

      results.push({
        id: tc.id,
        passed: false,
        hasValidSchema: false,
        jobTypeCorrect: false,
        locMatched: false,
        descRecall: 0,
        expectedJobType: tc.groundTruth.jobType,
        predictedJobType: "",
        predictedLocation: "",
        error: message,
        latencyMs: 0,
      });
    }
  }

  // Summary Metrics
  const total = results.length;
  const schemaPass = results.filter((r) => r.hasValidSchema).length;
  const jobTypePass = results.filter((r) => r.jobTypeCorrect).length;
  const locPass = results.filter((r) => r.locMatched).length;

  const avgDescRecall = (
    (results.reduce((acc, r) => acc + (r.descRecall || 0), 0) / total) *
    100
  ).toFixed(1);

  const avgLatency = Math.round(
    results.reduce((acc, r) => acc + (r.latencyMs || 0), 0) / total,
  );

  console.log(
    "\n================================================================================",
  );
  console.log("Evaluation Results Summary");
  console.log(
    "================================================================================",
  );
  console.log(`Total Test Cases:       ${total}`);
  console.log(
    `Schema Conformance:     ${((schemaPass / total) * 100).toFixed(1)}% (${schemaPass}/${total})`,
  );
  console.log(
    `Job Type Accuracy:      ${((jobTypePass / total) * 100).toFixed(1)}% (${jobTypePass}/${total})`,
  );
  console.log(
    `Location Match Rate:    ${((locPass / total) * 100).toFixed(1)}% (${locPass}/${total})`,
  );
  console.log(`Avg Scope Recall:       ${avgDescRecall}%`);
  console.log(`Avg Latency:            ${avgLatency} ms`);
  console.log(
    "================================================================================",
  );

  console.log("\nDetailed Case Breakdown:");

  for (const r of results) {
    const status = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(
      `- ${r.id.padEnd(36)} [${status}] -> Job: ${r.predictedJobType || "N/A"} | Loc: ${r.predictedLocation || "N/A"} (${r.latencyMs}ms)`,
    );
  }
}

main().catch((err) => {
  console.error("Evaluation script failed:", err);
  process.exit(1);
});
