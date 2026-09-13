"use node";

import { LangfuseSpanProcessor } from "@langfuse/otel";
import { env } from "../../_generated/server";
import type {
  ContextHandler,
  RawRequestResponseHandler,
  UsageHandler,
} from "@convex-dev/agent";
import { registerTelemetry } from "ai";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";

function requireEnvironmentVariable(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const langfusePublicKey = requireEnvironmentVariable(
  "LANGFUSE_PUBLIC_KEY",
  env.LANGFUSE_PUBLIC_KEY,
);

const langfuseSecretKey = requireEnvironmentVariable(
  "LANGFUSE_SECRET_KEY",
  env.LANGFUSE_SECRET_KEY,
);

const langfuseSpanProcessor = new LangfuseSpanProcessor({
  publicKey: langfusePublicKey,
  secretKey: langfuseSecretKey,
  baseUrl: requireEnvironmentVariable(
    "LANGFUSE_BASE_URL",
    env.LANGFUSE_BASE_URL,
  ),
  exportMode: "immediate",
  additionalHeaders: {
    "x-langfuse-ingestion-version": "4",
  },
});

export const agentTracerProvider = new NodeTracerProvider({
  spanProcessors: [langfuseSpanProcessor],
});

agentTracerProvider.register();

// AI SDK 7 emits telemetry callbacks; this integration turns them into OTel spans.
registerTelemetry(new LangfuseVercelAiSdkIntegration());

const rawRequestResponseHandler: RawRequestResponseHandler = (_ctx, args) => {
  console.log("[Agent raw request/response]", {
    request: args.request,
    response: args.response,
  });
};

const contextHandler: ContextHandler = (_ctx, { allMessages }) => {
  console.log("[Agent context]", { allMessages });

  return allMessages;
};

const usageHandler: UsageHandler = (
  _ctx,
  { userId, threadId, agentName, model, provider, usage },
) => {
  console.log("[Agent usage]", {
    userId,
    threadId,
    agentName,
    model,
    provider,
    usage,
  });
};

export function getAgentObservabilityConfig() {
  return {
    rawRequestResponseHandler,
    contextHandler,
    usageHandler,
  };
}

export async function flushAgentObservability(): Promise<void> {
  await langfuseSpanProcessor.forceFlush();
}
