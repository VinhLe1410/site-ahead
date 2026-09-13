import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type DatabaseReader = QueryCtx["db"] | MutationCtx["db"];

export async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);

  if (userId === null) {
    throw new Error("Not authenticated");
  }

  return userId;
}

export async function requireOwnedCategory(
  db: DatabaseReader,
  categoryId: Id<"categories">,
  ownerId: Id<"users">,
): Promise<Doc<"categories">> {
  const category = await db.get("categories", categoryId);

  if (category === null || category.ownerId !== ownerId) {
    throw new Error("Category not found");
  }

  return category;
}

export async function requireOwnedJob(
  db: DatabaseReader,
  jobId: Id<"jobs">,
  ownerId: Id<"users">,
): Promise<Doc<"jobs">> {
  const job = await db.get("jobs", jobId);

  if (job === null || job.ownerId !== ownerId) {
    throw new Error("Job not found");
  }

  return job;
}

export async function requireOwnedChecklistItem(
  db: DatabaseReader,
  itemId: Id<"checklistItems">,
  ownerId: Id<"users">,
): Promise<Doc<"checklistItems">> {
  const item = await db.get("checklistItems", itemId);

  if (item === null) {
    throw new Error("Checklist item not found");
  }

  await requireOwnedJob(db, item.jobId, ownerId);

  return item;
}
