"use node";

import { propagateAttributes } from "@langfuse/core";
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

import { context, trace, TraceFlags } from "@opentelemetry/api";
import { logAgentStage } from "./agentLogging";

export { logAgentStage } from "./agentLogging";

export type AgentParentTrace = { traceId: string; spanId: string };

let spanProcessor: LangfuseSpanProcessor | undefined;

let tracerProvider: NodeTracerProvider | undefined;

function initializeTelemetry() {
  if (tracerProvider !== undefined) return tracerProvider;

  try {
    if (
      env.LANGFUSE_PUBLIC_KEY &&
      env.LANGFUSE_SECRET_KEY &&
      env.LANGFUSE_BASE_URL
    ) {
      spanProcessor = new LangfuseSpanProcessor({
        publicKey: env.LANGFUSE_PUBLIC_KEY,
        secretKey: env.LANGFUSE_SECRET_KEY,
        baseUrl: env.LANGFUSE_BASE_URL,
        exportMode: "immediate",
        additionalHeaders: { "x-langfuse-ingestion-version": "4" },
      });
    } else {
      logAgentStage({ stage: "telemetry", outcome: "configuration_missing" });
    }
  } catch {
    logAgentStage({ stage: "telemetry", outcome: "initialization_failed" });
  }

  // A real local span still supplies trace IDs when exporting is unavailable.
  tracerProvider = new NodeTracerProvider({
    spanProcessors: spanProcessor ? [spanProcessor] : [],
  });
  tracerProvider.register();
  registerTelemetry(new LangfuseVercelAiSdkIntegration());

  return tracerProvider;
}

export async function withAgentTrace<T>(
  traceName: string,
  runId: string,
  operation: (traceId: string, spanId: string) => Promise<T>,
  parent?: AgentParentTrace,
): Promise<T> {
  const tracer = initializeTelemetry().getTracer("site-ahead.agents");

  const parentContext =
    parent === undefined
      ? context.active()
      : trace.setSpanContext(context.active(), {
          ...parent,
          traceFlags: TraceFlags.SAMPLED,
          isRemote: true,
        });

  return await tracer.startActiveSpan(
    traceName,
    {},
    parentContext,
    async (span) => {
      const traceId = span.spanContext().traceId;

      try {
        return await propagateAttributes(
          { traceName, tags: ["site-ahead"], metadata: { runId } },
          () => operation(traceId, span.spanContext().spanId),
        );
      } finally {
        span.end();
        await flushAgentObservability();
      }
    },
  );
}

const rawRequestResponseHandler: RawRequestResponseHandler = () => {
  logAgentStage({ stage: "model", outcome: "response_received" });
};

const contextHandler: ContextHandler = (_ctx, { allMessages, threadId }) => {
  logAgentStage({
    stage: "model",
    outcome: "context_loaded",
    threadId,
    count: allMessages.length,
  });

  return allMessages;
};

const usageHandler: UsageHandler = (_ctx, { threadId }) => {
  logAgentStage({ stage: "model", outcome: "usage_recorded", threadId });
};

export function getAgentObservabilityConfig() {
  return { rawRequestResponseHandler, contextHandler, usageHandler };
}

export const agentTelemetry = {
  isEnabled: true,
  recordInputs: false,
  recordOutputs: false,
};

export async function flushAgentObservability(): Promise<void> {
  try {
    await spanProcessor?.forceFlush();
  } catch {
    // Export failure must never roll back or conceal saved business outcomes.
    logAgentStage({ stage: "telemetry", outcome: "export_failed" });
  }
}
