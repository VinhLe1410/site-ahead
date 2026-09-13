"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { intakeResultValidator, requireText } from "./contracts";

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

function isExtractedPayload(value: unknown): value is ExtractedPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const extractFromTranscript = action({
  args: {
    transcript: v.string(),
    apiKey: v.optional(v.string()),
  },
  returns: intakeResultValidator,
  handler: async (_ctx, args) => {
    const rawTranscript = requireText(args.transcript, "Transcript");
    const apiKey = args.apiKey || process.env.OPENAI_API_KEY;

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
  },
});
