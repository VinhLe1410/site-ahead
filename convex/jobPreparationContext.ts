import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { executionSnapshot } from "../shared/item-agent-snapshots";
import {
  PREPARATION_CONTEXT_LIMIT,
  supportsPreparation,
} from "./preparationContracts";

async function fingerprint(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function loadPreparationContext(
  db: QueryCtx["db"],
  job: Doc<"jobs">,
) {
  const [input, category, items, states] = await Promise.all([
    db.get("inputs", job.inputId),
    job.categoryId ? db.get("categories", job.categoryId) : null,
    db
      .query("checklistItems")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .take(101),
    db
      .query("checklistAgentStates")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .take(101),
  ]);

  if (!input || input.organizationId !== job.organizationId)
    throw new ConvexError("Job input not found");

  if (
    job.categoryId &&
    (!category || category.organizationId !== job.organizationId)
  )
    throw new ConvexError("Job category not found");

  const supported = supportsPreparation(category?.title ?? null);

  const authoritative = {
    description: input.processedText,
    address: job.addressText,
    category: category?.title ?? null,
    categoryId: job.categoryId ?? null,
    confirmedConstructionYear: job.confirmedConstructionYear ?? null,
    confirmedFields: job.agentContext ?? null,
    checklist: items.map(({ _id, title, notes }) => ({
      id: _id,
      title,
      notes,
    })),
  };

  const checklist = items.map((item) => {
    const state = states.find((entry) => entry.itemId === item._id);

    const current =
      state?.snapshot ===
        executionSnapshot({
          job,
          input,
          category,
          item: { ...item, status: "pending" },
        }) &&
      !state?.queued &&
      state?.classification.status === "succeeded" &&
      state.execution === "finished" &&
      item.kind === "automated";

    return {
      title: item.title,
      kind: item.kind,
      status: item.status,
      notes: item.notes,
      finding: current ? (state.finding ?? null) : null,
      provenance: current ? state.provenance : [],
    };
  });

  const sourceText = JSON.stringify({ ...authoritative, checklist });

  const error =
    items.length > 100 || states.length > 100
      ? "This job exceeds the supported checklist size for preparation."
      : sourceText.length > PREPARATION_CONTEXT_LIMIT
        ? "This job has too much saved context for preparation. Shorten its description or notes and try again."
        : null;

  return {
    supported,
    checklistTitles: items.map((item) => item.title),
    description: input.processedText,
    sourceText,
    fingerprint: await fingerprint(sourceText),
    authoritativeFingerprint: await fingerprint(JSON.stringify(authoritative)),
    error,
  };
}
