import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { schema } from "./schema";
import {
  getMembership,
  requireMembership,
  requireOrganizationChecklistItem,
} from "./access";
import { loadItemContext } from "./jobAgentContext";
import { enqueueItem, loadExecutionRun } from "./checklistExecution";
import { executionSnapshot, itemAgentState } from "./itemAgentData";
import { isCertificateDelivery } from "../shared/electrical";
import { logAgentStage } from "./agents/shared/agentLogging";

const itemArgs = { itemId: v.id("checklistItems") };

async function editableContext(
  ctx: QueryCtx,
  itemId: Id<"checklistItems">,
  organizationId: Id<"organizations">,
) {
  const item = await requireOrganizationChecklistItem(
    ctx.db,
    itemId,
    organizationId,
  );

  if (!isCertificateDelivery(item.title) || item.kind !== "automated")
    throw new ConvexError("Choose the completed COES delivery item.");

  if (item.status !== "pending")
    throw new ConvexError(
      "Reopen this item before uploading or confirming a certificate.",
    );
  const state = await itemAgentState(ctx.db, itemId);

  if (
    state?.execution === "running" ||
    state?.queued ||
    state?.classification.status === "running"
  )
    throw new ConvexError(
      "Wait for the current run to finish before changing the certificate.",
    );
  const context = await loadItemContext(ctx.db, item);

  if (!context) throw new ConvexError("Job information is unavailable.");

  return context;
}

export const uploadContext = internalQuery({
  args: itemArgs,
  returns: v.object({ initiatedBy: v.id("users"), snapshot: v.string() }),
  handler: async (ctx, args) => {
    const member = await requireMembership(ctx);

    const context = await editableContext(
      ctx,
      args.itemId,
      member.organizationId,
    );

    return { initiatedBy: member.userId, snapshot: executionSnapshot(context) };
  },
});

export const registerUpload = internalMutation({
  args: {
    ...itemArgs,
    initiatedBy: v.id("users"),
    snapshot: v.string(),
    storageId: v.id("_storage"),
    filename: v.string(),
  },
  returns: v.id("electricalCertificates"),
  handler: async (ctx, args) => {
    const member = await getMembership(ctx.db, args.initiatedBy);

    if (member?.state !== "active")
      throw new ConvexError("Active organization access is required.");

    const context = await editableContext(
      ctx,
      args.itemId,
      member.organizationId,
    );

    if (executionSnapshot(context) !== args.snapshot)
      throw new ConvexError(
        "Job or certificate changed during upload. Review and upload again.",
      );
    const metadata = await ctx.db.system.get("_storage", args.storageId);

    if (
      !metadata ||
      metadata.size > 2_000_000 ||
      (metadata.contentType !== undefined &&
        metadata.contentType !== "application/pdf")
    )
      throw new ConvexError("A valid COES PDF up to 2 MB is required.");

    const values = {
      itemId: args.itemId,
      jobId: context.job._id,
      organizationId: member.organizationId,
      storageId: args.storageId,
      filename: args.filename,
      size: metadata.size,
      sha256: metadata.sha256,
      uploadedBy: member.userId,
      uploadedAt: Date.now(),
      snapshot: executionSnapshot({ ...context, certificate: null }),
    };

    const existing = context.certificate;
    let certificateId: Id<"electricalCertificates">;

    if (existing) {
      await ctx.db.replace("electricalCertificates", existing._id, values);
      await ctx.storage.delete(existing.storageId);
      certificateId = existing._id;
    } else
      certificateId = await ctx.db.insert("electricalCertificates", values);
    const state = await itemAgentState(ctx.db, args.itemId);

    if (state)
      await ctx.db.patch("checklistAgentStates", state._id, {
        snapshot: undefined,
        nextAction:
          "Confirm this uploaded completed COES and recipient to run the simulation. No email will be sent.",
        updatedAt: Date.now(),
      });

    return certificateId;
  },
});

export const get = query({
  args: itemArgs,
  returns: v.union(schema.doc("electricalCertificates"), v.null()),
  handler: async (ctx, args) => {
    const member = await requireMembership(ctx);
    await requireOrganizationChecklistItem(
      ctx.db,
      args.itemId,
      member.organizationId,
    );

    return await ctx.db
      .query("electricalCertificates")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .unique();
  },
});

export const downloadContext = internalQuery({
  args: itemArgs,
  returns: schema.doc("electricalCertificates"),
  handler: async (ctx, args) => {
    const member = await requireMembership(ctx);
    await requireOrganizationChecklistItem(
      ctx.db,
      args.itemId,
      member.organizationId,
    );

    const certificate = await ctx.db
      .query("electricalCertificates")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .unique();

    if (!certificate)
      throw new ConvexError("No uploaded certificate is available.");

    return certificate;
  },
});

export const confirm = mutation({
  args: {
    ...itemArgs,
    certificateId: v.id("electricalCertificates"),
    storageId: v.id("_storage"),
    recipient: v.string(),
    completedCertificateConfirmed: v.boolean(),
    simulationConfirmed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await requireMembership(ctx);

    const item = await requireOrganizationChecklistItem(
      ctx.db,
      args.itemId,
      member.organizationId,
    );

    const existing = await ctx.db.get(
      "electricalCertificates",
      args.certificateId,
    );

    const recipient = args.recipient.trim().toLowerCase();

    if (!args.completedCertificateConfirmed || !args.simulationConfirmed)
      throw new ConvexError(
        "Explicitly confirm the completed certificate and simulation recipient.",
      );

    if (recipient.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))
      throw new ConvexError("Provide a valid recipient email.");

    if (
      !existing ||
      existing.itemId !== item._id ||
      existing.organizationId !== member.organizationId ||
      existing.storageId !== args.storageId
    )
      throw new ConvexError(
        "The certificate changed. Review the current upload before confirming.",
      );

    const current = await loadItemContext(ctx.db, item);
    const state = await itemAgentState(ctx.db, item._id);

    const alreadyConfirmed =
      current !== null &&
      existing.confirmedAt !== undefined &&
      existing.recipient === recipient &&
      existing.confirmationKey !== undefined &&
      existing.snapshot ===
        executionSnapshot({
          ...current,
          item: { ...item, status: "pending" },
          certificate: null,
        });

    if (alreadyConfirmed && (state?.queued || state?.execution === "running"))
      return null;

    if (
      alreadyConfirmed &&
      item.status === "done" &&
      existing.simulatedAt !== undefined &&
      state?.finding?.kind === "simulated_certificate_delivery" &&
      state.finding.confirmationKey === existing.confirmationKey
    )
      return null;

    const context = await editableContext(
      ctx,
      args.itemId,
      member.organizationId,
    );

    const confirmationKey = `${existing._id}:${existing.sha256}:${recipient}:${Date.now()}`;

    if (!alreadyConfirmed)
      await ctx.db.patch("electricalCertificates", existing._id, {
        recipient,
        confirmedBy: member.userId,
        confirmedAt: Date.now(),
        confirmationKey,
        simulatedAt: undefined,
        snapshot: executionSnapshot({ ...context, certificate: null }),
      });

    if (!(await enqueueItem(ctx, item, member.userId))) {
      await ctx.scheduler.runAfter(
        0,
        internal.agents.checklist.processChecklist.run,
        { items: [item], initiatedBy: member.userId },
      );
    }

    return null;
  },
});

export const simulate = internalMutation({
  args: {
    item: schema.doc("checklistItems"),
    runId: v.string(),
    traceId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await loadExecutionRun(ctx, {
      itemId: args.item._id,
      runId: args.runId,
    });

    if (!run || !isCertificateDelivery(run.context.item.title)) return null;

    const logIds = {
      itemId: args.item._id,
      runId: args.runId,
      threadId: run.state.threadId,
      traceId: args.traceId,
      toolId: "simulate_certificate_delivery",
    };

    const certificate = run.context.certificate;

    const metadata = certificate
      ? await ctx.db.system.get("_storage", certificate.storageId)
      : null;

    const confirmationMember = certificate?.confirmedBy
      ? await getMembership(ctx.db, certificate.confirmedBy)
      : null;

    const ready =
      certificate &&
      metadata?.sha256 === certificate.sha256 &&
      certificate.recipient &&
      certificate.confirmedAt !== undefined &&
      certificate.confirmationKey &&
      confirmationMember?.state === "active" &&
      confirmationMember.organizationId === run.context.job.organizationId &&
      certificate.snapshot ===
        executionSnapshot({ ...run.context, certificate: null });

    if (
      !ready ||
      !certificate?.recipient ||
      !certificate.confirmationKey ||
      certificate.confirmedAt === undefined
    ) {
      await ctx.db.patch("checklistAgentStates", run.state._id, {
        execution: "waiting",
        traceId: args.traceId,
        currentStep: "waiting",
        error: undefined,
        updatedAt: Date.now(),
        missingInformation: [
          {
            field: "completed_certificate_and_recipient",
            label: "Completed COES PDF and confirmed recipient",
            reason:
              "Upload the actual completed COES PDF, then explicitly confirm the certificate and recipient. This PoC only simulates delivery; no email is sent.",
          },
        ],
        nextAction:
          "Upload and confirm the completed COES and recipient to simulate delivery. No email will be sent.",
      });
      logAgentStage({ stage: "waiting", outcome: "waiting", ...logIds });
    } else {
      const observedAt = certificate.simulatedAt ?? Date.now();
      await ctx.db.patch("electricalCertificates", certificate._id, {
        simulatedAt: observedAt,
      });
      await ctx.db.patch("checklistAgentStates", run.state._id, {
        execution: "finished",
        traceId: args.traceId,
        currentStep: "saved",
        error: undefined,
        updatedAt: Date.now(),
        missingInformation: [],
        finding: {
          kind: "simulated_certificate_delivery",
          mode: "simulation",
          emailSent: false,
          summary: `Simulated delivery — no email sent. ${certificate.filename} was confirmed for ${certificate.recipient}.`,
          coverage:
            "PoC simulation only. The member confirmed this uploaded file and recipient; Site Ahead has not verified certification, testing, inspection or actual email delivery.",
          observedAt,
          certificateId: certificate._id,
          filename: certificate.filename,
          recipient: certificate.recipient,
          confirmationKey: certificate.confirmationKey,
        },
        provenance: [
          {
            source: "Member-confirmed certificate and recipient",
            method: "manual",
            observedAt: certificate.confirmedAt,
            suppliedBy: certificate.confirmedBy,
          },
          {
            source:
              "Deterministic PoC delivery simulation — no email provider called",
            method: "simulation",
            observedAt,
          },
        ],
        nextAction:
          "Simulated delivery — no email sent. Arrange actual certificate delivery outside Site Ahead if required.",
      });
      await ctx.db.patch("checklistItems", args.item._id, { status: "done" });
      logAgentStage({ stage: "persistence", outcome: "saved", ...logIds });
    }

    await ctx.scheduler.runAfter(0, internal.checklistExecution.drain, {
      jobId: run.context.job._id,
    });

    return null;
  },
});
