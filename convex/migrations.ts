import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getMembership, getRollout } from "./access";
import { schema } from "./schema";

const BATCH_SIZE = 50;

const phases = [
  "users",
  "inputs",
  "categories",
  "jobs",
  "validateUsers",
  "validateOrganizations",
  "validateInputs",
  "validateCategories",
  "validateJobs",
  "validateChecklistItems",
  "validated",
] as const;

async function requireMigration(ctx: MutationCtx) {
  const rollout = await getRollout(ctx.db);

  if (rollout === null)
    throw new Error("Start the organization migration first");

  if (rollout.phase === "ready")
    throw new Error(
      "Sharing is enabled. Pause it before migration or validation.",
    );

  return { ...rollout, phase: rollout.phase };
}

async function legacyOrganization(
  ctx: MutationCtx,
  ownerId: Id<"users"> | undefined,
) {
  if (ownerId === undefined)
    throw new Error("Unmigrated record has no creator");
  const membership = await getMembership(ctx.db, ownerId);

  if (
    membership === null ||
    membership.state !== "active" ||
    membership.role !== "owner"
  )
    throw new Error(`Creator ${ownerId} has no migrated owner membership`);

  return membership.organizationId;
}

async function validateOrganization(
  ctx: MutationCtx,
  organizationId: Id<"organizations"> | undefined,
) {
  if (
    organizationId === undefined ||
    (await ctx.db.get("organizations", organizationId)) === null
  )
    throw new Error("Record has no valid organization");

  return organizationId;
}

async function validateLegacyRecord(
  ctx: MutationCtx,
  record: Doc<"inputs"> | Doc<"categories"> | Doc<"jobs">,
) {
  const organizationId = await validateOrganization(ctx, record.organizationId);

  if (
    record.ownerId !== undefined &&
    (await legacyOrganization(ctx, record.ownerId)) !== organizationId
  )
    throw new Error(`Record ${record._id} crossed organization boundaries`);

  return organizationId;
}

export const status = internalQuery({
  args: {},
  returns: v.union(schema.doc("tenancyRollout"), v.null()),
  handler: async (ctx) => await getRollout(ctx.db),
});

export const start = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const rollout = await getRollout(ctx.db);

    if (rollout === null)
      await ctx.db.insert("tenancyRollout", {
        key: "organization-tenancy",
        cutoff: Date.now(),
        phase: "users",
        cursor: null,
      });

    // Repeated starts keep the original cutoff and cursor.
    return null;
  },
});

export const batch = internalMutation({
  args: {},
  returns: schema.doc("tenancyRollout"),
  handler: async (ctx) => {
    const rollout = await requireMigration(ctx);

    if (rollout.phase === "validated") return rollout;

    const options = {
      numItems: rollout.phase.startsWith("validate") ? 1 : BATCH_SIZE,
      cursor: rollout.cursor,
      maximumBytesRead: 2_000_000,
    };

    let progress: { isDone: boolean; continueCursor: string };

    switch (rollout.phase) {
      case "users": {
        const result = await ctx.db
          .query("users")
          .withIndex("by_creation_time", (q) =>
            q.lte("_creationTime", rollout.cutoff),
          )
          .paginate(options);

        for (const user of result.page) {
          const membership = await getMembership(ctx.db, user._id);

          if (membership === null) {
            const organizationId = await ctx.db.insert("organizations", {
              name: "My organization",
            });

            await ctx.db.insert("memberships", {
              userId: user._id,
              organizationId,
              role: "owner",
              state: "active",
            });
          } else if (
            membership.role !== "owner" ||
            membership.state !== "active"
          ) {
            throw new Error(
              `Existing user ${user._id} is not an owner; do not overwrite membership`,
            );
          }

          if (user.email !== undefined)
            await ctx.db.patch("users", user._id, {
              normalizedEmail: user.email.trim().toLowerCase(),
            });
        }

        progress = result;
        break;
      }

      case "inputs": {
        const result = await ctx.db
          .query("inputs")
          .withIndex("by_creation_time")
          .paginate(options);

        for (const record of result.page)
          if (record.organizationId === undefined)
            await ctx.db.patch("inputs", record._id, {
              organizationId: await legacyOrganization(ctx, record.ownerId),
            });
        progress = result;
        break;
      }

      case "categories": {
        const result = await ctx.db
          .query("categories")
          .withIndex("by_creation_time")
          .paginate(options);

        for (const record of result.page)
          if (record.organizationId === undefined)
            await ctx.db.patch("categories", record._id, {
              organizationId: await legacyOrganization(ctx, record.ownerId),
            });
        progress = result;
        break;
      }

      case "jobs": {
        const result = await ctx.db
          .query("jobs")
          .withIndex("by_creation_time")
          .paginate(options);

        for (const record of result.page)
          if (record.organizationId === undefined)
            await ctx.db.patch("jobs", record._id, {
              organizationId: await legacyOrganization(ctx, record.ownerId),
            });
        progress = result;
        break;
      }

      case "validateUsers": {
        const result = await ctx.db
          .query("users")
          .withIndex("by_creation_time", (q) =>
            q.lte("_creationTime", rollout.cutoff),
          )
          .paginate(options);

        for (const user of result.page)
          await validateOrganization(
            ctx,
            await legacyOrganization(ctx, user._id),
          );
        progress = result;
        break;
      }

      case "validateOrganizations": {
        const result = await ctx.db
          .query("organizations")
          .withIndex("by_creation_time")
          .paginate(options);

        for (const organization of result.page) {
          const owners = await ctx.db
            .query("memberships")
            .withIndex("by_organizationId_and_role_and_state", (q) =>
              q
                .eq("organizationId", organization._id)
                .eq("role", "owner")
                .eq("state", "active"),
            )
            .take(2);

          if (owners.length !== 1)
            throw new Error(
              `Organization ${organization._id} must have exactly one owner`,
            );
          const owner = owners[0];

          if (
            owner === undefined ||
            (await ctx.db.get("users", owner.userId)) === null
          )
            throw new Error("Organization owner account is missing");
        }

        progress = result;
        break;
      }

      case "validateInputs": {
        const result = await ctx.db
          .query("inputs")
          .withIndex("by_creation_time")
          .paginate(options);

        for (const record of result.page)
          await validateLegacyRecord(ctx, record);
        progress = result;
        break;
      }

      case "validateCategories": {
        const result = await ctx.db
          .query("categories")
          .withIndex("by_creation_time")
          .paginate(options);

        for (const record of result.page)
          await validateLegacyRecord(ctx, record);
        progress = result;
        break;
      }

      case "validateJobs": {
        const result = await ctx.db
          .query("jobs")
          .withIndex("by_creation_time")
          .paginate(options);

        for (const job of result.page) {
          const organizationId = await validateLegacyRecord(ctx, job);
          const input = await ctx.db.get("inputs", job.inputId);

          if (input === null || input.organizationId !== organizationId)
            throw new Error(`Job ${job._id} has an invalid input`);

          if (job.categoryId !== undefined) {
            const category = await ctx.db.get("categories", job.categoryId);

            if (category === null || category.organizationId !== organizationId)
              throw new Error(`Job ${job._id} has an invalid category`);
          }
        }

        progress = result;
        break;
      }

      case "validateChecklistItems": {
        const result = await ctx.db
          .query("checklistItems")
          .withIndex("by_creation_time")
          .paginate(options);

        for (const item of result.page) {
          const job = await ctx.db.get("jobs", item.jobId);

          if (job === null)
            throw new Error(`Checklist item ${item._id} has no job`);
          await validateOrganization(ctx, job.organizationId);
        }

        progress = result;
        break;
      }
    }

    const index = phases.indexOf(rollout.phase);
    const nextPhase = phases[index + 1];

    if (nextPhase === undefined) throw new Error("Invalid migration phase");
    await ctx.db.patch("tenancyRollout", rollout._id, {
      phase: progress.isDone ? nextPhase : rollout.phase,
      cursor: progress.isDone ? null : progress.continueCursor,
    });
    const updated = await ctx.db.get("tenancyRollout", rollout._id);

    if (updated === null) throw new Error("Migration state disappeared");

    return updated;
  },
});

export const enable = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const rollout = await requireMigration(ctx);

    if (rollout.phase !== "validated")
      throw new Error(
        "Complete every backfill and validation batch before enabling sharing",
      );
    await ctx.db.patch("tenancyRollout", rollout._id, { phase: "ready" });

    return null;
  },
});

export const pause = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const rollout = await getRollout(ctx.db);

    if (rollout === null) throw new Error("Migration has not started");

    if (rollout.phase === "ready")
      await ctx.db.patch("tenancyRollout", rollout._id, {
        phase: "validateUsers",
        cursor: null,
      });

    return null;
  },
});
