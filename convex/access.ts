import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

type DatabaseReader = QueryCtx["db"];

export async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);

  if (userId === null) throw new ConvexError("Not authenticated");

  return userId;
}

export async function getMembership(db: DatabaseReader, userId: Id<"users">) {
  return await db
    .query("memberships")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export async function activeMembership(ctx: QueryCtx | MutationCtx) {
  const userId = await requireUserId(ctx);
  const membership = await getMembership(ctx.db, userId);

  return membership?.state === "active" ? membership : null;
}

export async function requireMembership(ctx: QueryCtx | MutationCtx) {
  const membership = await activeMembership(ctx);

  if (membership === null)
    throw new ConvexError("Organization access is no longer available.");

  return membership;
}

export const authorizeIntake = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireMembership(ctx);

    return null;
  },
});

export async function requireOwner(ctx: QueryCtx | MutationCtx) {
  const membership = await requireMembership(ctx);

  if (membership.role !== "owner")
    throw new ConvexError("Only the owner can manage the organization.");

  return membership;
}

export async function requireOrganizationCategory(
  db: DatabaseReader,
  categoryId: Id<"categories">,
  organizationId: Id<"organizations">,
): Promise<Doc<"categories">> {
  const category = await db.get("categories", categoryId);

  if (category === null || category.organizationId !== organizationId)
    throw new ConvexError("Category not found");

  return category;
}

export async function requireOrganizationJob(
  db: DatabaseReader,
  jobId: Id<"jobs">,
  organizationId: Id<"organizations">,
): Promise<Doc<"jobs">> {
  const job = await db.get("jobs", jobId);

  if (job === null || job.organizationId !== organizationId)
    throw new ConvexError("Job not found");

  return job;
}

export async function requireOrganizationChecklistItem(
  db: DatabaseReader,
  itemId: Id<"checklistItems">,
  organizationId: Id<"organizations">,
): Promise<Doc<"checklistItems">> {
  const item = await db.get("checklistItems", itemId);

  if (item === null) throw new ConvexError("Checklist item not found");
  await requireOrganizationJob(db, item.jobId, organizationId);

  return item;
}

export async function requireOrganizationDocument(
  db: DatabaseReader,
  documentId: Id<"documents">,
  organizationId: Id<"organizations">,
) {
  const document = await db.get("documents", documentId);

  if (document === null || document.organizationId !== organizationId)
    throw new ConvexError("Document not found");

  return document;
}

export async function requireOrganizationDocumentVersion(
  db: DatabaseReader,
  versionId: Id<"documentVersions">,
  organizationId: Id<"organizations">,
) {
  const version = await db.get("documentVersions", versionId);

  if (version === null) throw new ConvexError("Document version not found");

  const document = await requireOrganizationDocument(
    db,
    version.documentId,
    organizationId,
  );

  return { document, version };
}

export async function verifiedEmail(ctx: QueryCtx | MutationCtx) {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get("users", userId);

  if (user === null) throw new ConvexError("Account not found");

  return user.googleEmailVerified === true && user.email !== undefined
    ? user.email.trim().toLowerCase()
    : null;
}
