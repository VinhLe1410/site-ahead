"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { action, env } from "../../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { flushAgentObservability } from "../shared/observability";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY ?? "" });

const jobCategorySchema = z.object({
  category: z.enum(["electrical_work", "carpentry_renovation", "unresolved"]),
});

export const classifyJob = action({
  args: {
    jobDescription: v.string(),
  },
  returns: v.object({
    category: v.union(
      v.literal("electrical_work"),
      v.literal("carpentry_renovation"),
      v.literal("unresolved"),
    ),
  }),
  handler: async (_ctx, args) => {
    if (!env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not configured on the Convex deployment; job classification cannot run.",
      );
    }

    const description = args.jobDescription.trim();

    try {
      const result = await generateObject({
        model: openai.chat("gpt-4o-mini"),
        schema: jobCategorySchema,
        schemaName: "job_category",
        schemaDescription:
          "One of the two supported trades, or unresolved when the description is ambiguous or out of scope.",
        system:
          "Classify job descriptions for Site Ahead. Return electrical_work only for clearly electrical work such as switchboards, mains, wiring, safety switches, or electrical safety paperwork. Return carpentry_renovation only for clearly carpentry or building renovation work such as decks, framing, extensions, or renovation permits. Return unresolved for empty, vague, ambiguous, plumbing, landscaping, or any other out-of-scope description. Never force a category when the evidence is insufficient.",
        prompt: `Classify this job description:\n\n${description || "(empty)"}`,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "agents.checklist.classifier",
          recordInputs: true,
          recordOutputs: true,
        },
      });

      return result.object;
    } finally {
      await flushAgentObservability();
    }
  },
});
