"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { propagateAttributes } from "@langfuse/core";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { components } from "../../_generated/api";
import { action, env } from "../../_generated/server";
import { checklistKindValidator } from "../../contracts";
import { v } from "convex/values";
import {
  flushAgentObservability,
  getAgentObservabilityConfig,
} from "../shared/observability";
import {
  normalizeItemClassifications,
  type ChecklistInputItem,
  type ModelClassification,
} from "./itemClassification";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY ?? "" });

const modelClassificationSchema = z.object({
  id: z.union([z.number(), z.string()]),
  category: z.string(),
});

// A2 classifies checklist items only; it does not resolve jobs or call external APIs.
const itemResolutionClassifierAgent = new Agent(components.agent, {
  name: "item-resolution-classifier",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions:
    "Classify every supplied checklist item into exactly one canonical resolution category. Return every input item exactly once and preserve each original id.",
  ...getAgentObservabilityConfig(),
});

const checklistItemIdValidator = v.union(v.number(), v.string());

export const classifyChecklistItems = action({
  args: {
    job_type: v.string(),
    checklist: v.array(
      v.object({
        id: checklistItemIdValidator,
        item: v.string(),
      }),
    ),
  },
  returns: v.object({
    classifications: v.array(
      v.object({
        id: checklistItemIdValidator,
        category: checklistKindValidator,
      }),
    ),
    fallbacks: v.array(
      v.object({
        id: checklistItemIdValidator,
        reason: v.string(),
      }),
    ),
    unknownModelItemIds: v.array(checklistItemIdValidator),
    threadId: v.string(),
    traceName: v.string(),
  }),
  handler: async (ctx, args) => {
    const jobType = args.job_type.trim();

    if (!jobType) {
      throw new Error("job_type must not be empty");
    }

    if (args.checklist.length === 0) {
      throw new Error("checklist must contain at least one item");
    }

    const inputIds = new Set<string>();

    for (const checklistItem of args.checklist) {
      const idKey = String(checklistItem.id);

      if (!idKey.trim()) {
        throw new Error("Every checklist item must have a nonblank id");
      }

      if (inputIds.has(idKey)) {
        throw new Error(`Checklist item id must be unique: ${idKey}`);
      }

      inputIds.add(idKey);

      if (!checklistItem.item.trim()) {
        throw new Error(`Checklist item ${idKey} must have nonblank text`);
      }
    }

    if (!env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not configured on the Convex deployment; checklist item classification cannot run.",
      );
    }

    const { threadId } = await itemResolutionClassifierAgent.createThread(ctx, {
      title: "Checklist item category classification",
    });

    const traceName = `site-ahead-item-classification-${randomUUID()}`;

    const checklistForPrompt = args.checklist.map(({ id, item }) => ({
      id,
      item,
    }));

    const prompt = `Classify every checklist item below into exactly one of these canonical categories:

- automated: resolvable instantly from a live API or deterministic rule, such as Construction year, Air Quality, or Road Closure.
- third_party: requires a form or enquiry sent to a council, asset owner, regulator, or inspector, such as Powerlines/underground services or permit submissions.
- on_site: requires a person's judgement or paperwork only they can complete, such as a physical assessment.

Return one object for every input item, preserve each id exactly, and never omit an item. The job type is context only; classify the item by what is needed to resolve it.

job_type: ${jobType}
checklist: ${JSON.stringify(checklistForPrompt)}`;

    let modelClassifications: ModelClassification[] = [];
    let modelFailureReason: string | undefined;

    try {
      const modelResult = await propagateAttributes(
        {
          traceName,
          tags: ["site-ahead", "item-resolution-classifier"],
          metadata: { classificationRunId: traceName },
        },
        () =>
          itemResolutionClassifierAgent.generateObject(
            ctx,
            { threadId },
            {
              output: "array",
              schema: modelClassificationSchema,
              schemaName: "checklist_item_classifications",
              schemaDescription:
                "One object per input checklist item with its original id and canonical resolution category.",
              prompt,
              experimental_telemetry: {
                isEnabled: true,
                functionId: "site-ahead.item-resolution-classifier",
              },
            },
          ),
      );

      if (Array.isArray(modelResult.object)) {
        modelClassifications = modelResult.object;
      } else {
        modelFailureReason = "missing_model_classification_array";
      }
    } catch (error) {
      modelFailureReason = "model_output_error";
      console.warn("[Checklist item classification model fallback]", {
        error: error instanceof Error ? error.message : "Unknown model error",
      });
    } finally {
      await flushAgentObservability();
    }

    const normalized = normalizeItemClassifications(
      args.checklist satisfies ChecklistInputItem[],
      modelClassifications,
      modelFailureReason,
    );

    if (normalized.fallbacks.length > 0) {
      console.warn("[Checklist item classification fallback]", {
        fallbacks: normalized.fallbacks,
      });
    }

    if (normalized.unknownModelItemIds.length > 0) {
      console.warn("[Checklist item classification unknown model ids]", {
        unknownModelItemIds: normalized.unknownModelItemIds,
      });
    }

    return {
      classifications: normalized.classifications,
      fallbacks: normalized.fallbacks,
      unknownModelItemIds: normalized.unknownModelItemIds,
      threadId,
      traceName,
    };
  },
});
