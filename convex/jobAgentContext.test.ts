/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);

  const records = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", { name: "Owner" });
    const staffId = await ctx.db.insert("users", { name: "Staff" });
    const outsiderId = await ctx.db.insert("users", { name: "Other" });

    const organizationId = await ctx.db.insert("organizations", {
      name: "Demo",
    });

    const otherOrganizationId = await ctx.db.insert("organizations", {
      name: "Other",
    });

    await ctx.db.insert("memberships", {
      userId: ownerId,
      organizationId,
      role: "owner",
      state: "active",
    });

    const staffMembershipId = await ctx.db.insert("memberships", {
      userId: staffId,
      organizationId,
      role: "staff",
      state: "active",
    });

    await ctx.db.insert("memberships", {
      userId: outsiderId,
      organizationId: otherOrganizationId,
      role: "owner",
      state: "active",
    });

    const inputId = await ctx.db.insert("inputs", {
      organizationId,
      processedText: "Renovation",
      addressText: "123 Sample Road",
    });

    const jobId = await ctx.db.insert("jobs", {
      organizationId,
      inputId,
      addressText: "123 Sample Road",
      status: "pending",
    });

    const itemId = await ctx.db.insert("checklistItems", {
      jobId,
      title: "Construction year",
      kind: "automated",
      status: "pending",
      notes: "Keep this note",
    });

    return { ownerId, staffId, outsiderId, staffMembershipId, jobId, itemId };
  });

  return {
    t,
    ...records,
    staff: t.withIdentity({ subject: `${records.staffId}|session` }),
    outsider: t.withIdentity({ subject: `${records.outsiderId}|session` }),
  };
}

describe("confirmed job context", () => {
  test("staff can save and clear a year with server-derived attribution without dispatching", async () => {
    const { t, staff, staffId, jobId, itemId } = await setup();
    const before = Date.now();
    await staff.mutation(api.jobAgentContext.setConstructionYear, {
      jobId,
      year: 1985,
    });

    const context = await t.query(internal.jobAgentContext.get, {
      itemId,
      initiatedBy: staffId,
    });

    expect(context?.job.confirmedConstructionYear).toMatchObject({
      year: 1985,
      suppliedBy: staffId,
    });
    expect(
      context?.job.confirmedConstructionYear?.suppliedAt,
    ).toBeGreaterThanOrEqual(before);
    expect(context?.item).toMatchObject({
      status: "pending",
      notes: "Keep this note",
    });
    expect(context?.item._creationTime).toBeTypeOf("number");
    expect(
      await t.run((ctx) => ctx.db.query("checklistAgentStates").take(1)),
    ).toEqual([]);
    await staff.mutation(api.jobAgentContext.setConstructionYear, {
      jobId,
      year: null,
    });
    expect(
      (
        await t.query(internal.jobAgentContext.get, {
          itemId,
          initiatedBy: staffId,
        })
      )?.job.confirmedConstructionYear,
    ).toBeUndefined();
  });

  test("invalid years do not replace a previously confirmed year", async () => {
    const { t, staff, staffId, jobId, itemId } = await setup();
    await staff.mutation(api.jobAgentContext.setConstructionYear, {
      jobId,
      year: 1985,
    });

    for (const year of [
      1799,
      1985.5,
      new Date().getUTCFullYear() + 1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])
      await expect(
        staff.mutation(api.jobAgentContext.setConstructionYear, {
          jobId,
          year,
        }),
      ).rejects.toThrow("Construction year");
    expect(
      (
        await t.query(internal.jobAgentContext.get, {
          itemId,
          initiatedBy: staffId,
        })
      )?.job.confirmedConstructionYear?.year,
    ).toBe(1985);
  });

  test("other organizations, signed-out callers and removed members cannot change context", async () => {
    const { t, staff, outsider, staffId, staffMembershipId, jobId, itemId } =
      await setup();

    await expect(
      outsider.mutation(api.jobAgentContext.setConstructionYear, {
        jobId,
        year: 1985,
      }),
    ).rejects.toThrow("Job not found");
    await expect(
      t.mutation(api.jobAgentContext.setConstructionYear, {
        jobId,
        year: 1985,
      }),
    ).rejects.toThrow("Not authenticated");
    await t.run((ctx) =>
      ctx.db.patch("memberships", staffMembershipId, { state: "removed" }),
    );
    await expect(
      staff.mutation(api.jobAgentContext.setConstructionYear, {
        jobId,
        year: 1985,
      }),
    ).rejects.toThrow("Organization access");
    expect(
      await t.query(internal.jobAgentContext.get, {
        itemId,
        initiatedBy: staffId,
      }),
    ).toBeNull();
  });

  test("location and request fields require bounded confirmed values", async () => {
    const { t, staff, staffId, jobId, itemId } = await setup();
    await expect(
      staff.mutation(api.jobAgentContext.setFields, {
        jobId,
        fields: { latitude: -37.81 },
      }),
    ).rejects.toThrow("both latitude");
    await expect(
      staff.mutation(api.jobAgentContext.setFields, {
        jobId,
        fields: { latitude: 91, longitude: 144.96 },
      }),
    ).rejects.toThrow("latitude within Victoria");
    await expect(
      staff.mutation(api.jobAgentContext.setFields, {
        jobId,
        fields: { plannedStartDate: "2026-02-30" },
      }),
    ).rejects.toThrow("valid planned start");
    await expect(
      staff.mutation(api.jobAgentContext.setFields, {
        jobId,
        fields: { clientName: "x".repeat(501) },
      }),
    ).rejects.toThrow("500 characters");
    await staff.mutation(api.jobAgentContext.setFields, {
      jobId,
      fields: {
        latitude: -37.81,
        longitude: 144.96,
        contractorName: " Demo Contractor ",
        plannedStartDate: "2026-10-01",
      },
    });
    expect(
      (
        await t.query(internal.jobAgentContext.get, {
          itemId,
          initiatedBy: staffId,
        })
      )?.job.agentContext,
    ).toMatchObject({
      contractorName: "Demo Contractor",
      suppliedBy: staffId,
      latitude: -37.81,
    });
  });
});
