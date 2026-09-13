"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { propagateAttributes } from "@langfuse/core";
import { components } from "../../_generated/api";
import { action, env } from "../../_generated/server";
import { v } from "convex/values";
import {
  flushAgentObservability,
  getAgentObservabilityConfig,
} from "./observability";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY ?? "" });

// Generic infrastructure-only smoke test for shared Agent observability.
// This is safe to keep indefinitely and must not depend on feature-specific logic.
const observabilitySmokeTestAgent = new Agent(components.agent, {
  name: "observability-smoke-test",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: "Reply briefly and exactly to the verification prompt.",
  ...getAgentObservabilityConfig(),
});

export const runObservabilitySmokeTest = action({
  args: {
    smokeTestId: v.string(),
  },
  returns: v.object({
    smokeTestId: v.string(),
    threadId: v.string(),
    text: v.string(),
  }),
  handler: async (ctx, args) => {
    const smokeTestId = args.smokeTestId.trim();

    if (!smokeTestId) {
      throw new Error("smokeTestId must not be empty");
    }

    if (!env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not configured on the Convex deployment; the observability smoke test cannot run.",
      );
    }

    const { threadId } = await observabilitySmokeTestAgent.createThread(ctx, {
      title: "Observability smoke test",
    });

    const traceName = `site-ahead-observability-smoke-${smokeTestId}`;

    const result = await propagateAttributes(
      {
        traceName,
        tags: ["site-ahead", "observability-smoke-test"],
        metadata: { smokeTestId },
      },
      () =>
        observabilitySmokeTestAgent.generateText(
          ctx,
          { threadId },
          {
            prompt: "Reply with exactly: observability smoke test passed.",
            experimental_telemetry: {
              isEnabled: true,
              functionId: "site-ahead.observability-smoke-test",
            },
          },
        ),
    );

    await flushAgentObservability();

    return { smokeTestId, threadId, text: result.text };
  },
});
