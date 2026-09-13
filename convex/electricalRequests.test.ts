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
import { PDFDocument } from "pdf-lib";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function electricalFixture(
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

test("Electrical drafts label general examples and keep protected fields human-only", async () => {
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
  ).toContain(
    "DRAFT — Planned electrical work; electrician review required before certification.",
  );
  expect(
    portal.draft?.fields.find((field) => field.field === "contractor_licence")
      ?.value,
  ).toBeNull();
  expect(
    portal.draft?.fields.find((field) => field.field === "customer_email"),
  ).toMatchObject({
    method: "demo_data",
    value: expect.stringContaining(
      "[DEMO DATA — replace or confirm before use]",
    ),
  });
  expect(
    portal.draft?.fields.find((field) => field.field === "description_of_work")
      ?.value,
  ).toContain(
    "Planned replacement of the complete main switchboard and consumer mains at 198 Berkeley Street, Carlton.",
  );
  expect(
    portal.draft?.fields.find((field) => field.field === "planned_scope")
      ?.value,
  ).toBe(f.context.input.processedText);
  expect(
    portal.missingInformation.some(
      (field) => field.field === "actual_description_of_work",
    ),
  ).toBe(true);

  const inspector = prepareElectricalRequest(
    {
      ...f.context,
      item: { ...f.context.item, title: electricalItems[2].title },
    },
    Date.now(),
  );

  expect(inspector.draft?.body).toContain(
    "Completed work, testing and inspection are not established",
  );
  expect(inspector.draft?.body).not.toContain(f.context.input.processedText);
  expect(inspector.draft?.body).toContain("[supply actual licence]");
  expect(inspector.draft?.body).not.toContain("Ironbark");
  expect(inspector.draft?.body).toContain(
    "[DEMO DATA — replace or confirm before use]",
  );
  expect(
    inspector.draft?.fields.find((field) => field.field === "inspector_email")
      ?.value,
  ).toBeNull();
  expect(
    inspector.draft?.fields.find((field) => field.field === "inspector_name")
      ?.value,
  ).toBeNull();
  expect(
    inspector.draft?.fields.find((field) => field.field === "planned_start"),
  ).toMatchObject({
    method: "demo_data",
    value: expect.stringContaining("subject to customer agreement"),
  });
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

test("saved general facts win and a draft without fallbacks records no demo provenance", async () => {
  const f = await electricalFixture();

  const agentContext = {
    clientName: "Confirmed customer",
    clientEmail: "confirmed@customer.example",
    contractorName: "Confirmed contractor",
    contractorEmail: "confirmed@contractor.example",
    contractorPhone: "Confirmed phone",
    plannedStartDate: "2026-10-01",
    siteAccess: "Confirmed access instructions",
    suppliedBy: f.userId,
    suppliedAt: Date.now(),
  };

  const context = { ...f.context, job: { ...f.context.job, agentContext } };
  const portal = prepareElectricalRequest(context, Date.now());

  const inspector = prepareElectricalRequest(
    { ...context, item: { ...context.item, title: electricalItems[2].title } },
    Date.now(),
  );

  expect(
    portal.draft?.fields.find((field) => field.field === "customer_email"),
  ).toMatchObject({ value: agentContext.clientEmail, method: "database" });
  expect(
    portal.draft?.fields.find((field) => field.field === "contractor_name"),
  ).toMatchObject({ value: agentContext.contractorName, method: "database" });
  expect(
    portal.draft?.fields.some((field) => field.method === "demo_data"),
  ).toBe(false);
  expect(
    inspector.draft?.fields.find((field) => field.field === "planned_start"),
  ).toMatchObject({ value: agentContext.plannedStartDate, method: "database" });
  expect(
    inspector.draft?.fields.find((field) => field.field === "site_access"),
  ).toMatchObject({ value: agentContext.siteAccess, method: "database" });
  expect(inspector.draft?.body).toContain(agentContext.contractorEmail);
  expect(inspector.draft?.body).not.toContain("[DEMO DATA");
  await f.t.run(async (ctx) => {
    await ctx.db.patch("jobs", f.jobId, { agentContext });
    await ctx.db.patch("checklistAgentStates", f.stateId, {
      snapshot: executionSnapshot(context),
    });
  });
  await f.t.mutation(internal.electricalRequests.save, {
    itemId: f.itemId,
    runId: "run-1",
    traceId: "trace",
  });

  const state = await f.t.run((ctx) =>
    ctx.db.get("checklistAgentStates", f.stateId),
  );

  expect(state?.provenance.some((entry) => entry.method === "demo_data")).toBe(
    false,
  );
  expect(
    (await f.t.run((ctx) => ctx.db.get("jobs", f.jobId)))?.agentContext,
  ).toEqual(agentContext);
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
  expect(
    (
      await f.t.run((ctx) => ctx.db.get("checklistAgentStates", f.stateId))
    )?.provenance.some((entry) => entry.method === "demo_data"),
  ).toBe(true);
  expect(
    (await f.t.run((ctx) => ctx.db.get("jobs", f.jobId)))?.agentContext,
  ).toBeUndefined();
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

async function uploadedCertificate() {
  const f = await electricalFixture(electricalItems[7].title, "automated");
  await f.t.run((ctx) =>
    ctx.db.patch("checklistAgentStates", f.stateId, { execution: "waiting" }),
  );
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("TEST FIXTURE ONLY - NOT A COES");
  const bytes = Uint8Array.from(await pdf.save()).buffer;

  const certificateId = await f.member.action(
    api.electricalCertificateFiles.upload,
    { itemId: f.itemId, filename: "test-not-a-coes.pdf", bytes },
  );

  const certificate = await f.member.query(api.electricalDelivery.get, {
    itemId: f.itemId,
  });

  if (!certificate) throw new Error("fixture_missing");

  return { ...f, certificateId, certificate, bytes };
}

type CertificateFixture = Awaited<ReturnType<typeof uploadedCertificate>>;

function confirmation(f: CertificateFixture) {
  return {
    itemId: f.itemId,
    certificateId: f.certificateId,
    storageId: f.certificate.storageId,
    recipient: "test-only@example.com",
    completedCertificateConfirmed: true,
    simulationConfirmed: true,
  };
}

async function drainSimulation(f: CertificateFixture) {
  await f.t.mutation(internal.checklistExecution.drain, { jobId: f.jobId });

  const state = await f.t.run((ctx) =>
    ctx.db.get("checklistAgentStates", f.stateId),
  );

  const item = await f.t.run((ctx) => ctx.db.get("checklistItems", f.itemId));

  if (!state?.runId || !item) throw new Error("fixture_missing");

  return { item, runId: state.runId, traceId: "simulation-test" };
}

test("certificate validation, private retrieval and missing prerequisites", async () => {
  const f = await uploadedCertificate();
  await expect(
    f.member.action(api.electricalCertificateFiles.upload, {
      itemId: f.itemId,
      filename: "invalid.pdf",
      bytes: new TextEncoder().encode("not a PDF").buffer,
    }),
  ).rejects.toThrow("readable");
  await expect(
    f.member.action(api.electricalCertificateFiles.upload, {
      itemId: f.itemId,
      filename: "oversized.pdf",
      bytes: new ArrayBuffer(2_000_001),
    }),
  ).rejects.toThrow("2 MB");
  await expect(
    f.t.action(api.electricalCertificateFiles.download, { itemId: f.itemId }),
  ).rejects.toThrow();

  const otherUser = await f.t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {});

    const organizationId = await ctx.db.insert("organizations", {
      name: "Other",
    });

    await ctx.db.insert("memberships", {
      userId,
      organizationId,
      role: "owner",
      state: "active",
    });

    return userId;
  });

  await expect(
    f.t
      .withIdentity({ subject: `${otherUser}|other` })
      .action(api.electricalCertificateFiles.download, { itemId: f.itemId }),
  ).rejects.toThrow();

  const downloaded = await f.member.action(
    api.electricalCertificateFiles.download,
    { itemId: f.itemId },
  );

  expect(downloaded.bytes.byteLength).toBe(f.bytes.byteLength);
  await f.member.mutation(api.checklistExecution.retry, { itemId: f.itemId });
  await f.t.mutation(
    internal.electricalDelivery.simulate,
    await drainSimulation(f),
  );
  expect(
    await f.t.run((ctx) => ctx.db.get("checklistItems", f.itemId)),
  ).toMatchObject({ status: "pending" });
  expect(
    await f.t.run((ctx) => ctx.db.get("checklistAgentStates", f.stateId)),
  ).toMatchObject({ execution: "waiting" });
});

test("explicit confirmation produces one simulated result, without provider calls", async () => {
  const f = await uploadedCertificate();
  await expect(
    f.member.mutation(api.electricalDelivery.confirm, {
      ...confirmation(f),
      completedCertificateConfirmed: false,
    }),
  ).rejects.toThrow("Explicitly");
  await f.member.mutation(api.electricalDelivery.confirm, confirmation(f));

  const first = await f.member.query(api.electricalDelivery.get, {
    itemId: f.itemId,
  });

  await f.member.mutation(api.electricalDelivery.confirm, confirmation(f));
  const run = await drainSimulation(f);
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  try {
    await f.t.mutation(internal.electricalDelivery.simulate, run);
    await f.t.mutation(internal.electricalDelivery.simulate, run);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }

  expect(
    await f.t.run((ctx) => ctx.db.get("checklistItems", f.itemId)),
  ).toMatchObject({ status: "done" });
  expect(
    await f.t.run((ctx) => ctx.db.get("checklistAgentStates", f.stateId)),
  ).toMatchObject({
    execution: "finished",
    finding: {
      mode: "simulation",
      emailSent: false,
      confirmationKey: first?.confirmationKey,
    },
  });
  await f.member.mutation(api.electricalDelivery.confirm, confirmation(f));
  expect(
    (await f.member.query(api.electricalDelivery.get, { itemId: f.itemId }))
      ?.confirmationKey,
  ).toBe(first?.confirmationKey);
});

test("changed context revokes approval and rejects late simulation; same recipient can be reconfirmed", async () => {
  const f = await uploadedCertificate();
  await f.member.mutation(api.electricalDelivery.confirm, confirmation(f));
  const oldRun = await drainSimulation(f);
  await f.member.mutation(api.jobAgentContext.setFields, {
    jobId: f.jobId,
    fields: { clientEmail: "changed@example.com" },
  });
  await f.t.mutation(internal.electricalDelivery.simulate, oldRun);
  expect(
    (await f.t.run((ctx) => ctx.db.get("checklistItems", f.itemId)))?.status,
  ).toBe("pending");
  expect(
    (await f.member.query(api.electricalDelivery.get, { itemId: f.itemId }))
      ?.confirmedAt,
  ).toBeUndefined();
  await f.t.mutation(internal.checklistExecution.fail, {
    itemId: f.itemId,
    runId: oldRun.runId,
    reason: "saved_context_changed",
  });
  await f.member.mutation(api.electricalDelivery.confirm, confirmation(f));
  await f.t.mutation(
    internal.electricalDelivery.simulate,
    await drainSimulation(f),
  );
  expect(
    (await f.t.run((ctx) => ctx.db.get("checklistItems", f.itemId)))?.status,
  ).toBe("done");
});

test("manual completion is preserved and is not proof of simulation", async () => {
  const f = await uploadedCertificate();
  await f.member.mutation(api.electricalDelivery.confirm, confirmation(f));
  const run = await drainSimulation(f);
  await f.member.mutation(api.checklistItems.setStatus, {
    itemId: f.itemId,
    status: "done",
  });
  await f.t.mutation(internal.electricalDelivery.simulate, run);
  expect(
    (await f.member.query(api.electricalDelivery.get, { itemId: f.itemId }))
      ?.simulatedAt,
  ).toBeUndefined();
  expect(
    (await f.t.run((ctx) => ctx.db.get("checklistItems", f.itemId)))?.status,
  ).toBe("done");
});

test("job deletion cleans certificate storage even without an agent state", async () => {
  const f = await uploadedCertificate();
  await f.t.run((ctx) => ctx.db.delete("checklistAgentStates", f.stateId));
  await f.member.mutation(api.jobs.remove, { jobId: f.jobId });
  expect(
    await f.t.run((ctx) =>
      ctx.db.get("electricalCertificates", f.certificateId),
    ),
  ).toBeNull();
  expect(
    await f.t.run((ctx) =>
      ctx.db.system.get("_storage", f.certificate.storageId),
    ),
  ).toBeNull();
});
