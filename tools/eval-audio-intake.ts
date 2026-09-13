import fs from "node:fs";
import path from "node:path";

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

interface AudioTestCase {
  id: string;
  name: string;
  filename: string;
  mimeType: string;
  isNoisy: boolean;
  expectedJobType: "electrical" | "carpentry" | "other";
  expectedLocationTokens: string[];
  expectedDescriptionTokens: string[];
}

const AUDIO_TEST_CASES: AudioTestCase[] = [
  // Pair 1: Electrical (Switchboard & EV Charger)
  {
    id: "TC-ELEC-01-CLEAN",
    name: "Residential Switchboard & EV Charger (Clean)",
    filename: "electrical-switchboard-clean.wav",
    mimeType: "audio/wav",
    isNoisy: false,
    expectedJobType: "electrical",
    expectedLocationTokens: ["42", "koala", "ringwood"],
    expectedDescriptionTokens: ["switchboard", "charger"],
  },
  {
    id: "TC-ELEC-01-NOISY",
    name: "Residential Switchboard & EV Charger (Background Noise)",
    filename: "electrical-switchboard-noisy.wav",
    mimeType: "audio/wav",
    isNoisy: true,
    expectedJobType: "electrical",
    expectedLocationTokens: ["42", "koala", "ringwood"],
    expectedDescriptionTokens: ["switchboard", "charger"],
  },

  // Pair 2: Carpentry (Timber Deck & Pergola)
  {
    id: "TC-CARP-01-CLEAN",
    name: "Timber Deck & Pergola Framing (Clean)",
    filename: "carpentry-deck-clean.wav",
    mimeType: "audio/wav",
    isNoisy: false,
    expectedJobType: "carpentry",
    expectedLocationTokens: ["84", "glenferrie", "malvern"],
    expectedDescriptionTokens: ["deck", "pergola", "timber"],
  },
  {
    id: "TC-CARP-01-NOISY",
    name: "Timber Deck & Pergola Framing (Background Noise)",
    filename: "carpentry-deck-noisy.wav",
    mimeType: "audio/wav",
    isNoisy: true,
    expectedJobType: "carpentry",
    expectedLocationTokens: ["84", "glenferrie", "malvern"],
    expectedDescriptionTokens: ["deck", "pergola", "timber"],
  },

  // Pair 3: Carpentry (Stud Framing & Doors)
  {
    id: "TC-CARP-02-CLEAN",
    name: "Structural Stud Wall Framing & Doors (Clean)",
    filename: "carpentry-framing-clean.wav",
    mimeType: "audio/wav",
    isNoisy: false,
    expectedJobType: "carpentry",
    expectedLocationTokens: ["19", "somerset", "richmond"],
    expectedDescriptionTokens: ["framing", "doors", "carpenter"],
  },
  {
    id: "TC-CARP-02-NOISY",
    name: "Structural Stud Wall Framing & Doors (Background Noise)",
    filename: "carpentry-framing-noisy.wav",
    mimeType: "audio/wav",
    isNoisy: true,
    expectedJobType: "carpentry",
    expectedLocationTokens: ["19", "somerset", "richmond"],
    expectedDescriptionTokens: ["framing", "doors", "carpenter"],
  },

  // Pair 4: Other (Emergency Plumbing Pipe Burst)
  {
    id: "TC-OTHR-01-CLEAN",
    name: "Emergency Burst Pipe Plumbing (Clean)",
    filename: "plumbing-burst-clean.wav",
    mimeType: "audio/wav",
    isNoisy: false,
    expectedJobType: "other",
    expectedLocationTokens: ["12", "elm", "kew"],
    expectedDescriptionTokens: ["burst", "pipe", "plumber"],
  },
  {
    id: "TC-OTHR-01-NOISY",
    name: "Emergency Burst Pipe Plumbing (Background Noise)",
    filename: "plumbing-burst-noisy.wav",
    mimeType: "audio/wav",
    isNoisy: true,
    expectedJobType: "other",
    expectedLocationTokens: ["12", "elm", "kew"],
    expectedDescriptionTokens: ["burst", "pipe", "plumber"],
  },

  // Pair 5: Electrical (Safety Switch Tripped & Outage)
  {
    id: "TC-ELEC-02-CLEAN",
    name: "Safety Switch Outage & Fuse Box (Clean)",
    filename: "electrical-outage-clean.wav",
    mimeType: "audio/wav",
    isNoisy: false,
    expectedJobType: "electrical",
    expectedLocationTokens: ["73", "kooyong", "caulfield"],
    expectedDescriptionTokens: ["power", "safety switch", "fuse"],
  },
  {
    id: "TC-ELEC-02-NOISY",
    name: "Safety Switch Outage & Fuse Box (Background Noise)",
    filename: "electrical-outage-noisy.wav",
    mimeType: "audio/wav",
    isNoisy: true,
    expectedJobType: "electrical",
    expectedLocationTokens: ["73", "kooyong", "caulfield"],
    expectedDescriptionTokens: ["power", "safety switch", "fuse"],
  },
];

interface ExtractedData {
  jobType?: unknown;
  location?: unknown;
  description?: unknown;
}

interface ElevenLabsApiResponse {
  text?: unknown;
  language_code?: unknown;
}

interface OpenAiApiResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

function isObject(val: unknown): val is ExtractedData {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isString(val: unknown): val is string {
  return typeof val === "string";
}

function loadEnvFile(filePath: string) {
  const envPath = path.resolve(process.cwd(), filePath);

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

async function transcribeWithElevenLabs(
  audioBuffer: Buffer,
  mimeType: string,
  filename: string,
  apiKey: string,
) {
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  const formData = new FormData();

  formData.append("file", blob, filename);
  formData.append("model_id", "scribe_v1");

  const startTime = Date.now();

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(`ElevenLabs API error (${response.status}): ${errorBody}`);
  }

  // SAFETY: parsed body adheres to ElevenLabs Speech to Text response structure
  const data = (await response.json()) as ElevenLabsApiResponse;

  if (!isString(data.text)) {
    throw new Error("Invalid response from ElevenLabs API.");
  }

  return {
    text: data.text.trim(),
    latencyMs,
  };
}

async function extractWithOpenAI(transcript: string, apiKey: string) {
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
    const errorBody = await response.text();

    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }

  // SAFETY: parsed body adheres to OpenAI chat completion response
  const data = (await response.json()) as OpenAiApiResponse;

  const firstChoice = data.choices?.[0];
  const content = firstChoice?.message?.content;

  if (!isString(content)) {
    throw new Error("Missing content in OpenAI response choice.");
  }

  const parsed: unknown = JSON.parse(content);

  return {
    parsed,
    rawContent: content,
    latencyMs,
  };
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  let elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  let openAiKey = process.env.OPENAI_API_KEY;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--elevenlabs-key=")) {
      elevenLabsKey = arg.replace("--elevenlabs-key=", "").trim();
    } else if (arg.startsWith("--openai-key=")) {
      openAiKey = arg.replace("--openai-key=", "").trim();
    }
  }

  console.log("=".repeat(80));
  console.log(
    "Site Ahead Audio Intake Pipeline — Evaluation Harness (ElevenLabs Scribe)",
  );
  console.log(`Configured test cases: ${AUDIO_TEST_CASES.length}`);
  console.log("=".repeat(80));

  const audioDir = path.resolve(process.cwd(), "tests/sample-audio");

  for (const testCase of AUDIO_TEST_CASES) {
    const filePath = path.join(audioDir, testCase.filename);

    if (!fs.existsSync(filePath)) {
      console.error(`Missing audio test file: ${filePath}`);
      process.exit(1);
    }

    const stats = fs.statSync(filePath);
    console.log(
      `- [Ready] ${testCase.filename} (${(stats.size / 1024).toFixed(1)} KB) -> ${testCase.name}`,
    );
  }

  if (!elevenLabsKey) {
    console.log("\n⚠️  No ELEVENLABS_API_KEY detected.");
    console.log(
      "   Provide via environment variable: export ELEVENLABS_API_KEY='sk_...'",
    );
    console.log(
      "   Or via command line argument: npm run eval:audio -- --elevenlabs-key='...'",
    );
    console.log("\nAudio fixtures and schema verified successfully (dry run).");

    return;
  }

  console.log(
    "\nStarting live audio evaluation against ElevenLabs Scribe...\n",
  );

  interface AudioEvalRecord {
    id: string;
    name: string;
    isNoisy: boolean;
    expectedJobType: string;
    predictedJobType: string;
    predictedLocation: string;
    tradeMatch: boolean;
    addressRecall: number;
    transcriptionLatency: number;
    extractionLatency: number;
    error?: string;
  }

  const results: AudioEvalRecord[] = [];

  for (const tc of AUDIO_TEST_CASES) {
    console.log("-".repeat(80));
    console.log(
      `Testing [${tc.id}] ${tc.isNoisy ? "🔊 [NOISE]" : "✨ [CLEAN]"}: ${tc.name}`,
    );

    const filePath = path.join(audioDir, tc.filename);
    const audioBuffer = fs.readFileSync(filePath);

    try {
      const transcriptionResult = await transcribeWithElevenLabs(
        audioBuffer,
        tc.mimeType,
        tc.filename,
        elevenLabsKey,
      );

      console.log(
        `🎙️  ElevenLabs Scribe (${transcriptionResult.latencyMs}ms): "${transcriptionResult.text}"`,
      );

      // Verify location token presence in transcript
      const transcriptLower = transcriptionResult.text.toLowerCase();

      const matchedTokens = tc.expectedLocationTokens.filter((token) =>
        transcriptLower.includes(token.toLowerCase()),
      );

      const addressRecall =
        matchedTokens.length / tc.expectedLocationTokens.length;

      console.log(
        `   Address Token Recall: ${matchedTokens.length}/${tc.expectedLocationTokens.length} (${matchedTokens.join(", ")})`,
      );

      let parsedJobType = "";
      let parsedLocation = "";
      let tradeMatch = false;
      let extractionLatency = 0;

      if (openAiKey) {
        const extractionResult = await extractWithOpenAI(
          transcriptionResult.text,
          openAiKey,
        );

        extractionLatency = extractionResult.latencyMs;

        const parsed = extractionResult.parsed;

        parsedJobType =
          isObject(parsed) && isString(parsed.jobType) ? parsed.jobType : "";

        parsedLocation =
          isObject(parsed) && isString(parsed.location) ? parsed.location : "";

        tradeMatch = parsedJobType === tc.expectedJobType;

        console.log(
          `🤖 OpenAI Extraction (${extractionLatency}ms) -> Job: "${parsedJobType}" ${tradeMatch ? "✓ PASS" : "✗ FAIL (expected " + tc.expectedJobType + ")"} | Loc: "${parsedLocation}"`,
        );
      }

      results.push({
        id: tc.id,
        name: tc.name,
        isNoisy: tc.isNoisy,
        expectedJobType: tc.expectedJobType,
        predictedJobType: parsedJobType,
        predictedLocation: parsedLocation,
        tradeMatch,
        addressRecall,
        transcriptionLatency: transcriptionResult.latencyMs,
        extractionLatency,
      });
    } catch (caught) {
      const errorMsg =
        caught instanceof Error ? caught.message : String(caught);

      console.error(`   ❌ Error: ${errorMsg}`);

      results.push({
        id: tc.id,
        name: tc.name,
        isNoisy: tc.isNoisy,
        expectedJobType: tc.expectedJobType,
        predictedJobType: "ERROR",
        predictedLocation: "",
        tradeMatch: false,
        addressRecall: 0,
        transcriptionLatency: 0,
        extractionLatency: 0,
        error: errorMsg,
      });
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("Audio Evaluation Summary: Clean vs Background Noise Comparison");
  console.log("=".repeat(80));

  const cleanCases = results.filter((r) => !r.isNoisy);
  const noisyCases = results.filter((r) => r.isNoisy);

  const cleanTrades = cleanCases.filter((r) => r.tradeMatch).length;
  const noisyTrades = noisyCases.filter((r) => r.tradeMatch).length;

  const cleanAvgRecall = (
    (cleanCases.reduce((sum, r) => sum + r.addressRecall, 0) /
      (cleanCases.length || 1)) *
    100
  ).toFixed(1);

  const noisyAvgRecall = (
    (noisyCases.reduce((sum, r) => sum + r.addressRecall, 0) /
      (noisyCases.length || 1)) *
    100
  ).toFixed(1);

  const cleanAvgTransLatency = Math.round(
    cleanCases.reduce((sum, r) => sum + r.transcriptionLatency, 0) /
      (cleanCases.length || 1),
  );

  const noisyAvgTransLatency = Math.round(
    noisyCases.reduce((sum, r) => sum + r.transcriptionLatency, 0) /
      (noisyCases.length || 1),
  );

  const cleanAvgTotalLatency = Math.round(
    cleanCases.reduce(
      (sum, r) => sum + r.transcriptionLatency + r.extractionLatency,
      0,
    ) / (cleanCases.length || 1),
  );

  const noisyAvgTotalLatency = Math.round(
    noisyCases.reduce(
      (sum, r) => sum + r.transcriptionLatency + r.extractionLatency,
      0,
    ) / (noisyCases.length || 1),
  );

  console.log("\nDetailed Track Breakdown:");

  for (const r of results) {
    const badge = r.isNoisy ? "[NOISY]" : "[CLEAN]";
    const status = r.tradeMatch ? "✓ PASS" : "✗ FAIL";
    console.log(
      `- ${r.id.padEnd(20)} ${badge.padEnd(8)} [${status}] -> Job: ${r.predictedJobType.padEnd(11)} | Loc: "${r.predictedLocation}" | Recall: ${(r.addressRecall * 100).toFixed(0)}% | STT: ${r.transcriptionLatency}ms`,
    );
  }

  console.log("\n" + "-".repeat(80));
  console.log(
    `Clean Tracks:   Accuracy: ${cleanTrades}/${cleanCases.length} (${((cleanTrades / (cleanCases.length || 1)) * 100).toFixed(1)}%) | Avg Address Recall: ${cleanAvgRecall}% | Avg Latency: ${cleanAvgTransLatency}ms STT (${cleanAvgTotalLatency}ms total)`,
  );
  console.log(
    `Noisy Tracks:   Accuracy: ${noisyTrades}/${noisyCases.length} (${((noisyTrades / (noisyCases.length || 1)) * 100).toFixed(1)}%) | Avg Address Recall: ${noisyAvgRecall}% | Avg Latency: ${noisyAvgTransLatency}ms STT (${noisyAvgTotalLatency}ms total)`,
  );
  console.log("-".repeat(80));
}

void main();
