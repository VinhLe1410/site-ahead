import { expect, test, vi } from "vitest";
import { logAgentStage } from "./agentLogging";

test("structured logging drops extra secret/document fields and unsafe identifiers", () => {
  const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);

  try {
    const event = {
      stage: "form_read" as const,
      outcome: "loaded" as const,
      itemId: "item-123",
      toolId: "Authorization: Bearer secret",
      secret: "provider-secret",
      documentContents: "Private client details",
      authorization: "Bearer another-secret",
    };

    logAgentStage(event);
    const output = JSON.stringify(spy.mock.calls);
    expect(output).toContain("item-123");
    expect(output).not.toContain("secret");
    expect(output).not.toContain("Private client");
    expect(output).not.toContain("Authorization");
  } finally {
    spy.mockRestore();
  }
});
