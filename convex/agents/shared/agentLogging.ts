const stages = [
  "classification",
  "dispatch",
  "skill_selection",
  "database_lookup",
  "api_call",
  "form_read",
  "form_fill",
  "persistence",
  "waiting",
  "model",
  "telemetry",
] as const;

const outcomes = [
  "claimed",
  "started",
  "succeeded",
  "failed",
  "skipped",
  "saved",
  "loaded",
  "selected",
  "filled",
  "unresolved",
  "waiting",
  "configuration_missing",
  "initialization_failed",
  "export_failed",
  "response_received",
  "context_loaded",
  "usage_recorded",
  "model_output_error",
  "model_configuration_missing",
  "classification_save_failed",
] as const;

export type AgentStage = (typeof stages)[number];

export type AgentOutcome = (typeof outcomes)[number];

export type AgentLog = {
  stage: AgentStage;
  outcome: AgentOutcome;
  itemId?: string;
  threadId?: string;
  runId?: string;
  traceId?: string;
  toolId?: string;
  skillId?: string;
  count?: number;
};

function identifier(value: string | undefined) {
  return value !== undefined && /^[a-zA-Z0-9_.:-]{1,128}$/.test(value)
    ? value
    : undefined;
}

export function logAgentStage(event: AgentLog) {
  // Explicit projection is the runtime boundary; extra caller properties never log.
  console.log("[Agent stage]", {
    stage: stages.find((stage) => stage === event.stage) ?? "telemetry",
    outcome: outcomes.find((outcome) => outcome === event.outcome) ?? "failed",
    itemId: identifier(event.itemId),
    threadId: identifier(event.threadId),
    runId: identifier(event.runId),
    traceId: identifier(event.traceId),
    toolId: identifier(event.toolId),
    skillId: identifier(event.skillId),
    count: Number.isSafeInteger(event.count) ? event.count : undefined,
  });
}
