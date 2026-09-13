import { createThread, listMessages, saveMessages } from "@convex-dev/agent";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v, type Infer } from "convex/values";
import { api, components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  getMembership,
  requireMembership,
  requireOrganizationCategory,
} from "./access";
import { jobInputValidator, requireText } from "./contracts";
import { schema } from "./schema";

const turnArgs = { draftId: v.id("jobDrafts"), runId: v.string() };

const turnTimeout = 120_000;

export const draftUpdateValidator = v.object({
  processedText: v.union(v.string(), v.null()),
  addressText: v.union(v.string(), v.null()),
  categoryId: v.union(v.string(), v.null()),
  clearCategory: v.boolean(),
});

async function activeDraft(
  ctx: QueryCtx | MutationCtx,
  membership: Doc<"memberships">,
) {
  return await ctx.db
    .query("jobDrafts")
    .withIndex("by_userId_and_organizationId_and_status", (q) =>
      q
        .eq("userId", membership.userId)
        .eq("organizationId", membership.organizationId)
        .eq("status", "draft"),
    )
    .unique();
}

async function ownedDraft(
  ctx: QueryCtx | MutationCtx,
  draftId: Id<"jobDrafts">,
) {
  const membership = await requireMembership(ctx);
  const draft = await ctx.db.get("jobDrafts", draftId);

  if (
    draft === null ||
    draft.userId !== membership.userId ||
    draft.organizationId !== membership.organizationId
  )
    throw new ConvexError("Job draft not found.");

  return draft;
}

function requireEditable(draft: Doc<"jobDrafts">) {
  if (draft.status !== "draft")
    throw new ConvexError("This draft has already been submitted.");

  if (draft.runId !== undefined)
    throw new ConvexError(
      "Wait for the assistant to finish before changing the draft.",
    );
}

function cleanFields(fields: Infer<typeof jobInputValidator>) {
  const processedText = fields.processedText.trim();
  const addressText = fields.addressText.trim();

  if (processedText.length > 12_000 || addressText.length > 500)
    throw new ConvexError(
      "Keep the description under 12,000 characters and the address under 500.",
    );

  if (/^address not provided\.?$/i.test(addressText))
    throw new ConvexError("Enter the site address or leave it blank.");

  return { processedText, addressText, categoryId: fields.categoryId };
}

async function ensureDraft(
  ctx: MutationCtx,
  draftId?: Id<"jobDrafts">,
): Promise<Doc<"jobDrafts">> {
  if (draftId !== undefined) return await ownedDraft(ctx, draftId);
  const membership = await requireMembership(ctx);
  const existing = await activeDraft(ctx, membership);

  if (existing !== null) return existing;

  const threadId = await createThread(ctx, components.agent, {
    userId: membership.userId,
    title: "New job intake",
  });

  const id = await ctx.db.insert("jobDrafts", {
    userId: membership.userId,
    organizationId: membership.organizationId,
    threadId,
    status: "draft",
    revision: 0,
    processedText: "",
    addressText: "",
    categoryId: null,
  });

  const draft = await ctx.db.get("jobDrafts", id);

  if (draft === null) throw new Error("Created draft is unavailable.");

  return draft;
}

async function startTurn(
  ctx: MutationCtx,
  draft: Doc<"jobDrafts">,
  promptMessageId: string,
) {
  const runId = crypto.randomUUID();
  await ctx.db.patch("jobDrafts", draft._id, {
    runId,
    promptMessageId,
    error: undefined,
    deadlineAt: Date.now() + turnTimeout,
  });
  await ctx.scheduler.runAfter(0, internal.agents.intake.draftAgent.run, {
    draftId: draft._id,
    runId,
  });
  await ctx.scheduler.runAfter(turnTimeout, internal.jobDrafts.expire, {
    draftId: draft._id,
    runId,
  });
}

export const current = query({
  args: {},
  returns: v.union(schema.doc("jobDrafts"), v.null()),
  handler: async (ctx) => await activeDraft(ctx, await requireMembership(ctx)),
});

export const save = mutation({
  args: {
    ...jobInputValidator.fields,
    draftId: v.optional(v.id("jobDrafts")),
    revision: v.optional(v.number()),
  },
  returns: v.id("jobDrafts"),
  handler: async (ctx, args) => {
    const draft = await ensureDraft(ctx, args.draftId);
    requireEditable(draft);

    if ((args.revision ?? 0) !== draft.revision)
      throw new ConvexError(
        "The draft changed in another tab. Review the saved draft before saving again.",
      );
    const fields = cleanFields(args);

    if (fields.categoryId !== null)
      await requireOrganizationCategory(
        ctx.db,
        fields.categoryId,
        draft.organizationId,
      );
    await ctx.db.patch("jobDrafts", draft._id, {
      ...fields,
      revision: draft.revision + 1,
      error: undefined,
      promptMessageId: undefined,
    });

    return draft._id;
  },
});

export const send = mutation({
  args: { draftId: v.optional(v.id("jobDrafts")), text: v.string() },
  returns: v.id("jobDrafts"),
  handler: async (ctx, args) => {
    const draft = await ensureDraft(ctx, args.draftId);
    requireEditable(draft);
    const text = requireText(args.text, "Message");

    if (text.length > 12_000)
      throw new ConvexError("Keep messages under 12,000 characters.");

    const result = await saveMessages(ctx, components.agent, {
      threadId: draft.threadId,
      userId: draft.userId,
      messages: [{ role: "user", content: text }],
    });

    await startTurn(ctx, draft, result.messages[0]._id);

    return draft._id;
  },
});

export const retry = mutation({
  args: { draftId: v.id("jobDrafts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId);
    requireEditable(draft);

    if (draft.error === undefined || draft.promptMessageId === undefined)
      throw new ConvexError("There is no failed response to retry.");
    await startTurn(ctx, draft, draft.promptMessageId);

    return null;
  },
});

export const messages = query({
  args: { draftId: v.id("jobDrafts"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      _id: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      text: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId);

    const result = await listMessages(ctx, components.agent, {
      threadId: draft.threadId,
      paginationOpts: {
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 50),
      },
      excludeToolMessages: true,
      statuses: ["success"],
    });

    const page = result.page.flatMap((message) => {
      const role = message.message?.role;

      return (role === "user" || role === "assistant") &&
        message.text !== undefined
        ? [{ _id: message._id, role, text: message.text }]
        : [];
    });

    return { ...result, page };
  },
});

export const createJob = mutation({
  args: { draftId: v.id("jobDrafts"), revision: v.number() },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId);

    if (draft.jobId !== undefined) return draft.jobId;
    requireEditable(draft);

    if (args.revision !== draft.revision)
      throw new ConvexError(
        "The draft changed before submission. Review the saved details and create the job again.",
      );
    const fields = cleanFields(draft);
    const jobId: Id<"jobs"> = await ctx.runMutation(api.jobs.create, fields);
    await ctx.db.patch("jobDrafts", draft._id, { status: "submitted", jobId });

    return jobId;
  },
});

export const context = internalQuery({
  args: turnArgs,
  returns: v.union(
    v.object({
      draft: schema.doc("jobDrafts"),
      categories: v.array(schema.doc("categories").pick("_id", "title")),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get("jobDrafts", args.draftId);

    if (
      draft === null ||
      draft.status !== "draft" ||
      draft.runId !== args.runId
    )
      return null;
    const membership = await getMembership(ctx.db, draft.userId);

    if (
      membership?.state !== "active" ||
      membership.organizationId !== draft.organizationId
    )
      return null;

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", draft.organizationId),
      )
      .take(201);

    if (categories.length > 200)
      throw new ConvexError(
        "Choose a category manually. Automatic selection supports up to 200 categories.",
      );

    return {
      draft,
      categories: categories.map(({ _id, title }) => ({ _id, title })),
    };
  },
});

export const finish = internalMutation({
  args: {
    ...turnArgs,
    revision: v.number(),
    reply: v.string(),
    updates: draftUpdateValidator,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get("jobDrafts", args.draftId);

    if (
      draft === null ||
      draft.status !== "draft" ||
      draft.runId !== args.runId ||
      draft.revision !== args.revision
    )
      return false;

    if (draft.deadlineAt === undefined || draft.deadlineAt <= Date.now())
      return false;
    const membership = await getMembership(ctx.db, draft.userId);

    if (
      membership?.state !== "active" ||
      membership.organizationId !== draft.organizationId
    )
      return false;
    let categoryId = args.updates.clearCategory ? null : draft.categoryId;

    if (args.updates.categoryId !== null) {
      const selected = ctx.db.normalizeId(
        "categories",
        args.updates.categoryId,
      );

      if (selected === null)
        throw new ConvexError(
          "The assistant selected an invalid category. Retry its response.",
        );
      await requireOrganizationCategory(ctx.db, selected, draft.organizationId);
      categoryId = selected;
    }

    const fields = cleanFields({
      processedText: args.updates.processedText ?? draft.processedText,
      addressText: args.updates.addressText ?? draft.addressText,
      categoryId,
    });

    const reply = requireText(args.reply, "Assistant response");

    if (reply.length > 6_000)
      throw new ConvexError(
        "The assistant response was too long. Retry its response.",
      );
    // Commit the response and its draft changes together, so chat cannot claim an unsaved edit.
    await saveMessages(ctx, components.agent, {
      threadId: draft.threadId,
      userId: draft.userId,
      promptMessageId: draft.promptMessageId,
      messages: [{ role: "assistant", content: reply }],
    });
    await ctx.db.patch("jobDrafts", draft._id, {
      ...fields,
      revision: draft.revision + 1,
      runId: undefined,
      deadlineAt: undefined,
      error: undefined,
    });

    return true;
  },
});

export const fail = internalMutation({
  args: { ...turnArgs, error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get("jobDrafts", args.draftId);

    if (draft?.runId === args.runId)
      await ctx.db.patch("jobDrafts", draft._id, {
        runId: undefined,
        deadlineAt: undefined,
        error: args.error,
      });

    return null;
  },
});

export const expire = internalMutation({
  args: turnArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get("jobDrafts", args.draftId);

    if (draft?.runId === args.runId)
      await ctx.db.patch("jobDrafts", draft._id, {
        runId: undefined,
        deadlineAt: undefined,
        error:
          "The assistant took too long. Your draft and message are saved. Retry the response.",
      });

    return null;
  },
});
