"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  audioIntakeResultValidator,
  intakeResultValidator,
  requireText,
  transcriptionResultValidator,
} from "./contracts";

export const INTAKE_SYSTEM_PROMPT = `You are the AI Site Recon Intake Agent for Site Ahead, a platform for Australian trade contractors.
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

interface OpenAIChoice {
  message?: {
    content?: string;
  };
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
}

interface ExtractedPayload {
  jobType?: unknown;
  location?: unknown;
  description?: unknown;
}

interface ElevenLabsTranscriptionResponse {
  text?: unknown;
  language_code?: unknown;
}

function isExtractedPayload(value: unknown): value is ExtractedPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isElevenLabsTranscriptionResponse(
  value: unknown,
): value is ElevenLabsTranscriptionResponse {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getAudioFilename(mimeType: string): string {
  if (mimeType.includes("webm")) {
    return "audio.webm";
  }

  if (mimeType.includes("wav")) {
    return "audio.wav";
  }

  if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
    return "audio.m4a";
  }

  return "audio.mp3";
}

async function runExtraction(rawTranscript: string, overrideApiKey?: string) {
  const apiKey = overrideApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI API key is required. Set OPENAI_API_KEY in your Convex environment or provide apiKey in args.",
    );
  }

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
        { role: "user", content: rawTranscript },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }

  // SAFETY: fetch response JSON matches OpenAI chat completion API contract
  const data = (await response.json()) as OpenAIResponse;

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Failed to parse OpenAI JSON output: ${content}`);
  }

  if (!isExtractedPayload(parsed)) {
    throw new Error("Expected JSON object from model.");
  }

  let jobType: "excavation_and_trenching" | "electrical_work" | "other";

  if (
    parsed.jobType === "excavation_and_trenching" ||
    parsed.jobType === "electrical_work" ||
    parsed.jobType === "other"
  ) {
    jobType = parsed.jobType;
  } else {
    jobType = "other";
  }

  const location = isNonEmptyString(parsed.location)
    ? parsed.location.trim()
    : "Address not provided";

  const description = isNonEmptyString(parsed.description)
    ? parsed.description.trim()
    : rawTranscript;

  return {
    jobType,
    location,
    description,
  };
}

async function runElevenLabsTranscription(
  audioBase64: string,
  mimeType: string,
  overrideApiKey?: string,
) {
  const apiKey = overrideApiKey || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ElevenLabs API key is required. Set ELEVENLABS_API_KEY in your Convex environment or provide apiKey in args.",
    );
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  const filename = getAudioFilename(mimeType);

  const formData = new FormData();
  formData.append("file", audioBlob, filename);
  formData.append("model_id", "scribe_v1");

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(`ElevenLabs API error (${response.status}): ${errorBody}`);
  }

  // SAFETY: fetch response matches ElevenLabs Speech-to-Text API specification
  const data = (await response.json()) as unknown;

  if (!isElevenLabsTranscriptionResponse(data) || !isString(data.text)) {
    throw new Error("ElevenLabs returned invalid transcription output.");
  }

  return {
    text: data.text.trim(),
    languageCode: isString(data.language_code) ? data.language_code : undefined,
  };
}

export const extractFromTranscript = action({
  args: {
    transcript: v.string(),
    apiKey: v.optional(v.string()),
  },
  returns: intakeResultValidator,
  handler: async (_ctx, args) => {
    const rawTranscript = requireText(args.transcript, "Transcript");

    return await runExtraction(rawTranscript, args.apiKey);
  },
});

export const transcribeAudio = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.string(),
    apiKey: v.optional(v.string()),
  },
  returns: transcriptionResultValidator,
  handler: async (_ctx, args) => {
    requireText(args.audioBase64, "Audio base64");
    requireText(args.mimeType, "MIME type");

    return await runElevenLabsTranscription(
      args.audioBase64,
      args.mimeType,
      args.apiKey,
    );
  },
});

export const extractFromAudio = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.string(),
    elevenLabsApiKey: v.optional(v.string()),
    openAiApiKey: v.optional(v.string()),
  },
  returns: audioIntakeResultValidator,
  handler: async (_ctx, args) => {
    requireText(args.audioBase64, "Audio base64");
    requireText(args.mimeType, "MIME type");

    const transcription = await runElevenLabsTranscription(
      args.audioBase64,
      args.mimeType,
      args.elevenLabsApiKey,
    );

    const extraction = await runExtraction(
      transcription.text,
      args.openAiApiKey,
    );

    return {
      transcript: transcription.text,
      extraction,
    };
  },
});
