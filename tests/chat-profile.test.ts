import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

describe("agent saved profile context", () => {
  it("reads all saved profile fields afresh and restricts access to the owner", async () => {
    const t = convexTest(schema, modules);
    const { accountId, userId, otherUserId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "owner@example.com",
      });
      const otherUserId = await ctx.db.insert("users", {
        email: "other@example.com",
      });
      const accountId = await ctx.db.insert("accounts", {
        userId,
        email: "owner@example.com",
        name: "Dara",
        initials: "D",
        role: "Student",
        planName: "Study",
        countryFrom: "Cambodia",
        countryTo: "Canada",
        university: "",
        course: "Computing",
        paymentStatus: "not_started",
        selectedRoute: "",
        sponsorRequestSent: false,
      });
      return { accountId, userId, otherUserId };
    });
    const owner = t.withIdentity({ subject: `${userId}|session` });
    const profile = {
      accountId,
      name: "Dara",
      countryFrom: "Cambodia",
      countryTo: "Canada",
      university: "",
      course: "Computing",
      courseStart: "2027-09",
      financialStatus: "Saving for study",
      sponsorSupport: "Family support",
      fundingAmount: 12000,
    };
    await owner.mutation(api.accounts.updateProfile, profile);
    const first = await owner.query(internal.accounts.chatContext, {
      accountId,
    });
    expect(first.profile).toEqual({
      name: "Dara",
      role: "Student",
      homeCountry: "Cambodia",
      studyCountry: "Canada",
      university: "",
      course: "Computing",
      courseStart: "2027-09",
      financialStatus: "Saving for study",
      sponsorSupport: "Family support",
      confirmedFunding: 12000,
      fundingCurrency: "CAD",
    });
    await owner.mutation(api.accounts.updateProfile, {
      ...profile,
      course: "Mathematics",
      sponsorSupport: "",
      fundingAmount: 0,
    });
    const updated = await owner.query(internal.accounts.chatContext, {
      accountId,
    });
    expect(updated.profile).toMatchObject({
      course: "Mathematics",
      sponsorSupport: "",
      confirmedFunding: 0,
    });
    const other = t.withIdentity({ subject: `${otherUserId}|session` });
    await expect(
      other.query(internal.accounts.chatContext, { accountId }),
    ).rejects.toThrow("Account access denied");
  });
});
