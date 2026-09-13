/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import agentTest from "@convex-dev/agent/test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { loadItemContext } from "./jobAgentContext";
import { executionSnapshot } from "./itemAgentData";
import { electricalItems } from "../shared/electrical";
import { prepareElectricalRequest } from "./agents/requests/electricalRequestSkills";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

export async function electricalFixture(
  title: string = electricalItems[3].title,
  kind: "automated" | "third_party" = "third_party",
) {
  const t = convexTest(schema, modules);
  agentTest.register(t);

  const data = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Electrical owner" });

    const organizationId = await ctx.db.insert("organizations", {
      name: "Electrical fixtures",
    });

    const membershipId = await ctx.db.insert("memberships", {
      userId,
      organizationId,
      role: "owner",
      state: "active",
    });

    const inputId = await ctx.db.insert("inputs", {
      organizationId,
      addressText: "198 Berkeley Street, Carlton",
      processedText:
        "Replace the complete residential main switchboard and consumer mains. Work has not started; no tests or inspection.",
    });

    const jobId = await ctx.db.insert("jobs", {
      organizationId,
      inputId,
      addressText: "198 Berkeley Street, Carlton",
      status: "pending",
    });

    const itemId = await ctx.db.insert("checklistItems", {
      jobId,
      title,
      kind,
      status: "pending",
      notes: "",
    });

    const item = await ctx.db.get("checklistItems", itemId);

    if (!item) throw new Error("fixture_missing");
    const context = await loadItemContext(ctx.db, item);

    if (!context) throw new Error("fixture_missing");

    const stateId = await ctx.db.insert("checklistAgentStates", {
      itemId,
      jobId,
      classification: { status: "succeeded" },
      execution: "running",
      runId: "run-1",
      snapshot: executionSnapshot(context),
      initiatedBy: userId,
      deadlineAt: Date.now() + 180_000,
      currentStep: "model",
      updatedAt: Date.now(),
      provenance: [],
      missingInformation: [],
      nextAction: "Running",
    });

    return {
      userId,
      organizationId,
      membershipId,
      jobId,
      itemId,
      stateId,
      context,
    };
  });

  return {
    t,
    ...data,
    member: t.withIdentity({ subject: `${data.userId}|session` }),
  };
}

test("portal and inspector skills use real saved values and never Carpentry defaults", async () => {
  const f = await electricalFixture();
  const portal = prepareElectricalRequest(f.context, Date.now());
  expect(
    portal.draft?.fields.find((field) => field.field === "site_address"),
  ).toMatchObject({
    label: "Address",
    value: "198 Berkeley Street, Carlton",
    portalLabelVerified: true,
  });
  expect(
    portal.draft?.fields.find((field) => field.field === "description_of_work")
      ?.value,
  ).toBeNull();
  expect(
    portal.draft?.fields.find((field) => field.field === "contractor_licence")
      ?.value,
  ).toBeNull();

  const inspector = prepareElectricalRequest(
    {
      ...f.context,
      item: { ...f.context.item, title: electricalItems[2].title },
    },
    Date.now(),
  );

  expect(inspector.draft?.body).toContain("Work has not started");
  expect(inspector.draft?.body).toContain("[supply actual licence]");
  expect(inspector.draft?.body).not.toContain("Ironbark");
  expect(
    prepareElectricalRequest(
      {
        ...f.context,
        item: { ...f.context.item, title: electricalItems[2].title },
        input: { ...f.context.input, processedText: "Electrical repairs" },
      },
      Date.now(),
    ).draft,
  ).toBeNull();
});

test("draft persistence waits, rejects stale run and invalidates a later edit", async () => {
  const f = await electricalFixture();
  expect(
    await f.t.mutation(internal.electricalRequests.save, {
      itemId: f.itemId,
      runId: "wrong",
      traceId: "trace",
    }),
  ).toBe(false);
  expect(
    await f.t.mutation(internal.electricalRequests.save, {
      itemId: f.itemId,
      runId: "run-1",
      traceId: "trace",
    }),
  ).toBe(true);
  expect(
    await f.t.run((ctx) => ctx.db.get("checklistItems", f.itemId)),
  ).toMatchObject({ status: "pending" });
  expect(
    await f.t.run((ctx) => ctx.db.get("checklistAgentStates", f.stateId)),
  ).toMatchObject({
    execution: "waiting",
    requestDraft: { skillKey: "coes-portal" },
  });
  await f.member.mutation(api.checklistItems.setNotes, {
    itemId: f.itemId,
    notes: "Changed scope detail",
  });
  expect(
    (await f.t.run((ctx) => ctx.db.get("checklistAgentStates", f.stateId)))
      ?.snapshot,
  ).toBeUndefined();
});

test("removed membership cannot save a request result", async () => {
  const f = await electricalFixture();
  await f.t.run((ctx) =>
    ctx.db.patch("memberships", f.membershipId, { state: "removed" }),
  );
  expect(
    await f.t.mutation(internal.electricalRequests.save, {
      itemId: f.itemId,
      runId: "run-1",
      traceId: "trace",
    }),
  ).toBe(false);
});
