"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { action, env } from "../../_generated/server";
import { v } from "convex/values";
import {
  flushAgentObservability,
  getAgentObservabilityConfig,
} from "./observability";

// Temporary smoke-test agent. Delete this file once a real A3 agent carries this config.
const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY ?? "" });

const observabilitySmokeTestAgent = new Agent(components.agent, {
  name: "observability-smoke-test",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: "Reply with a brief acknowledgement.",
  ...getAgentObservabilityConfig(),
});

export const runObservabilitySmokeTest = action({
  args: {},
  returns: v.object({
    threadId: v.string(),
    text: v.string(),
  }),
  handler: async (ctx) => {
    if (!env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not configured on the Convex deployment; the observability smoke test cannot run.",
      );
    }

    const { threadId } = await observabilitySmokeTestAgent.createThread(ctx, {
      title: "Observability smoke test",
    });

    const result = await observabilitySmokeTestAgent.generateText(
      ctx,
      { threadId },
      {
        prompt: "Reply with exactly: observability smoke test passed.",
        experimental_telemetry: { isEnabled: true },
      },
    );

    await flushAgentObservability();

    return { threadId, text: result.text };
  },
});
