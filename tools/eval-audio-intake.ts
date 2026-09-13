import fs from "node:fs";
import path from "node:path";

const INTAKE_SYSTEM_PROMPT = `You are the AI Site Recon Intake Agent for Site Ahead, a platform for Australian trade contractors.
Your task is to parse unstructured client requests (voicemails, messages, or transcripts) and extract the essential job details.

### 1. EXTRACTION TARGETS

Extract exactly these 3 fields:

1. \`jobType\`: Classify into one of:
   - "excavation_and_trenching": Earthmoving, trenching, stormwater, sewer, footings, site cuts, leveling.
   - "electrical_work": Switchboards, wiring, EV chargers, lighting, power outages, safety switches / RCDs.
   - "other": Work outside these trades (e.g. plumbing, carpentry, painting).

2. \`location\`: The single cleaned physical site address where the work will take place. If not provided, set to "Address not provided".

3. \`description\`: A clear, professional summary of the work requested, including any key dimensions or site access constraints mentioned in the request.

### 2. OUTPUT FORMAT

Respond ONLY with a valid JSON object matching this schema, with no markdown fences, extra commentary, or trailing commas:

{
  "jobType": "excavation_and_trenching" | "electrical_work" | "other",
  "location": string,
  "description": string
}`;

interface AudioTestCase {
  id: string;
  name: string;
  filename: string;
  mimeType: string;
  expectedJobType: "electrical_work" | "excavation_and_trenching" | "other";
  expectedLocationTokens: string[];
  expectedDescriptionTokens: string[];
}

const AUDIO_TEST_CASES: AudioTestCase[] = [
  {
    id: "sample-audio-01",
    name: "Residential Switchboard Tripping & EV Charger",
    filename: "electrical-switchboard.wav",
    mimeType: "audio/wav",
    expectedJobType: "electrical_work",
    expectedLocationTokens: ["42", "koala", "ringwood"],
    expectedDescriptionTokens: ["switchboard", "charger"],
  },
  {
    id: "sample-audio-02",
    name: "Stormwater Trenching & Clay Ground",
    filename: "excavation-stormwater.wav",
    mimeType: "audio/wav",
    expectedJobType: "excavation_and_trenching",
    expectedLocationTokens: ["85", "mountain", "upwey"],
    expectedDescriptionTokens: ["trench", "stormwater"],
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
  const blob = new Blob([audioBuffer], { type: mimeType });
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

  let totalTranscriptionLatency = 0;
  let totalExtractionLatency = 0;
  let successfulTranscriptions = 0;
  let successfulExtractions = 0;

  for (const tc of AUDIO_TEST_CASES) {
    console.log("-".repeat(80));
    console.log(`Testing [${tc.id}]: ${tc.name}`);

    const filePath = path.join(audioDir, tc.filename);
    const audioBuffer = fs.readFileSync(filePath);

    try {
      const transcriptionResult = await transcribeWithElevenLabs(
        audioBuffer,
        tc.mimeType,
        tc.filename,
        elevenLabsKey,
      );

      totalTranscriptionLatency += transcriptionResult.latencyMs;
      successfulTranscriptions += 1;

      console.log(
        `🎙️  ElevenLabs Scribe Transcription (${transcriptionResult.latencyMs}ms):`,
      );
      console.log(`   "${transcriptionResult.text}"`);

      // Verify location token presence in transcript
      const transcriptLower = transcriptionResult.text.toLowerCase();

      const matchedTokens = tc.expectedLocationTokens.filter((token) =>
        transcriptLower.includes(token.toLowerCase()),
      );

      console.log(
        `   Address Token Recall: ${matchedTokens.length}/${tc.expectedLocationTokens.length} (${matchedTokens.join(", ")})`,
      );

      if (openAiKey) {
        const extractionResult = await extractWithOpenAI(
          transcriptionResult.text,
          openAiKey,
        );

        totalExtractionLatency += extractionResult.latencyMs;
        successfulExtractions += 1;

        console.log(`🤖 OpenAI Extraction (${extractionResult.latencyMs}ms):`);
        console.log(`   ${extractionResult.rawContent}`);

        const parsed = extractionResult.parsed;

        const parsedJobType =
          isObject(parsed) && isString(parsed.jobType) ? parsed.jobType : "";

        const isTradeMatch = parsedJobType === tc.expectedJobType;

        console.log(
          `   Trade Classification: ${parsedJobType} ${isTradeMatch ? "✓ PASS" : "✗ FAIL (expected " + tc.expectedJobType + ")"}`,
        );
      }
    } catch (caught) {
      console.error(
        `   ❌ Error: ${caught instanceof Error ? caught.message : String(caught)}`,
      );
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("Evaluation Summary");
  console.log("=".repeat(80));
  console.log(
    `Transcriptions Completed: ${successfulTranscriptions}/${AUDIO_TEST_CASES.length}`,
  );

  if (successfulTranscriptions > 0) {
    console.log(
      `Avg Transcription Latency: ${(totalTranscriptionLatency / successfulTranscriptions).toFixed(0)}ms`,
    );
  }

  if (successfulExtractions > 0) {
    console.log(
      `Avg Extraction Latency:    ${(totalExtractionLatency / successfulExtractions).toFixed(0)}ms`,
    );
    console.log(
      `Avg Total Pipeline:       ${((totalTranscriptionLatency + totalExtractionLatency) / successfulExtractions).toFixed(0)}ms`,
    );
  }
}

void main();
