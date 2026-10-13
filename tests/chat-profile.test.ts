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
        countryFrom: "China",
        countryTo: "United States",
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
      countryFrom: "China",
      countryTo: "United States",
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
      homeCountry: "China",
      studyCountry: "United States",
      destinationCountries: ["United States"],
      university: "",
      universityChoices: [],
      course: "Computing",
      courseStart: "2027-09",
      financialStatus: "Saving for study",
      sponsorSupport: "Family support",
      confirmedFunding: 12000,
      fundingCurrency: "USD",
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

it("persists the university shortlist through setup and Profile updates", async () => {
  const t = convexTest(schema, modules);
  const { userId, accountId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "shortlist@example.com",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "shortlist@example.com",
      name: "Dara",
      initials: "D",
      role: "Student",
      planName: "Study",
      countryFrom: "United States",
      countryTo: "China",
      university: "",
      course: "",
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
    });
    return { userId, accountId };
  });
  const owner = t.withIdentity({ subject: `${userId}|session` });
  const values = {
    name: "Dara Chan",
    countryFrom: "United States",
    countryTo: "China",
    countriesTo: ["China", "United Kingdom"],
    university: "Tsinghua University",
    universityChoices: ["Tsinghua University", "University of Manchester"],
    course: "Law",
    courseStart: "2026-09-21",
    fundingAmount: 201480,
    sponsorSupport: "Yes",
  };
  await owner.mutation(api.accounts.completeSetup, values);
  let state = await owner.query(api.accounts.bootstrap, {});
  expect(state.account.universityChoices).toEqual(values.universityChoices);
  expect(state.account.setupComplete).toBe(true);
  await owner.mutation(api.accounts.updateProfile, {
    ...values,
    accountId,
    financialStatus: "Partially funded",
    course: "Master of Finance · SEM",
  });
  state = await owner.query(api.accounts.bootstrap, {});
  expect(state.account.universityChoices).toEqual(values.universityChoices);
  expect(state.account.course).toBe("Master of Finance · SEM");
  await expect(
    t.mutation(api.accounts.completeSetup, values),
  ).rejects.toThrow();
  await expect(
    owner.mutation(api.accounts.updateProfile, {
      ...values,
      accountId,
      financialStatus: "",
      universityChoices: ["UCLA"],
    }),
  ).rejects.toThrow("selected destinations");
});
