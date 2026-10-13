/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { destinationCountries } from "../shared/study";

const modules = import.meta.glob("./**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules);
  const { userId, accountId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "destinations@example.com",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "destinations@example.com",
      name: "Student",
      initials: "S",
      role: "Student",
      planName: "Study",
      countryFrom: "China",
      countryTo: "United Kingdom",
      university: "",
      course: "",
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
      aiConsentAt: 1,
    });
    return { userId, accountId };
  });
  const owner = t.withIdentity({ subject: `${userId}|session` });
  const details = {
    name: "Student",
    countryFrom: "China",
    countryTo: "United Kingdom",
    university: "",
    course: "",
    courseStart: "",
    fundingAmount: 1000,
    sponsorSupport: "Yes",
  };
  return { t, owner, accountId, details };
}

describe("multiple destination countries", () => {
  it("supports legacy accounts and saves canonical, unique destinations through setup", async () => {
    const { owner, details } = await fixture();
    expect(
      destinationCountries(
        (await owner.query(api.accounts.bootstrap, {})).account,
      ),
    ).toEqual(["United Kingdom"]);
    await owner.mutation(api.accounts.completeSetup, {
      ...details,
      countriesTo: ["UK", "US", "United States"],
    });
    const result = await owner.query(api.accounts.bootstrap, {});
    expect(result.account.countriesTo).toEqual([
      "United Kingdom",
      "United States",
    ]);
    expect(result.config.profile.fundingCurrency).toBe("GBP");
  });
  it("preserves the active financial plan when adding destinations and rebases when switching primary", async () => {
    const { t, owner, accountId, details } = await fixture();
    await owner.mutation(api.accounts.completeSetup, details);
    await t.run((ctx) =>
      ctx.db.insert("costs", {
        accountId,
        key: "rent",
        name: "Rent",
        category: "Recurring",
        amount: 100,
        due: "Soon",
      }),
    );
    const proposalId = await t.run((ctx) =>
      ctx.db.insert("paymentProposals", {
        accountId,
        recipient: "University of Manchester",
        recipientLast4: "1234",
        routeKey: "test",
        provider: "Sandbox",
        fxRate: 1,
        sourceCurrency: "GBP",
        targetCurrency: "GBP",
        amountMinor: 10000,
        sourceMinor: 10000,
        feeMinor: 0,
        totalMinor: 10000,
        delivery: "Soon",
        status: "prepared",
        createdAt: 1,
        expiresAt: 9999999999999,
      }),
    );
    const update = {
      ...details,
      accountId,
      financialStatus: "Planning",
      countriesTo: ["United Kingdom", "United States"],
    };
    await owner.mutation(api.accounts.updateProfile, update);
    let result = await owner.query(api.accounts.bootstrap, {});
    expect(result.costs[0].amount).toBe(100);
    expect((await t.run((ctx) => ctx.db.get(proposalId)))?.status).toBe(
      "prepared",
    );
    expect(result.config.profile.fundingCurrency).toBe("GBP");
    await owner.mutation(api.accounts.updateProfile, {
      ...update,
      countryTo: "United States",
      university: "Columbia University",
    });
    result = await owner.query(api.accounts.bootstrap, {});
    expect(result.account).toMatchObject({
      countryTo: "United States",
      countriesTo: update.countriesTo,
      university: "Columbia University",
    });
    expect(result.config.profile.fundingCurrency).toBe("USD");
    expect(result.costs[0].amount).toBeGreaterThan(100);
    expect((await t.run((ctx) => ctx.db.get(proposalId)))?.status).toBe(
      "cancelled",
    );
    const context = await owner.query(internal.accounts.chatContext, {
      accountId,
    });
    expect(context.profile.destinationCountries).toEqual([
      "United States",
      "United Kingdom",
    ]);
    // Older clients that omit the new argument retain the saved list.
    await owner.mutation(api.accounts.updateProfile, {
      ...details,
      accountId,
      countryTo: "United States",
      financialStatus: "Planning",
    });
    expect(
      (await owner.query(api.accounts.bootstrap, {})).account.countriesTo,
    ).toEqual(["United States", "United Kingdom"]);
    await owner.mutation(api.accounts.updateProfile, {
      ...update,
      countriesTo: ["United Kingdom"],
    });
    expect(
      (await owner.query(api.accounts.bootstrap, {})).account.countriesTo,
    ).toEqual(["United Kingdom"]);
  });
  it("rejects invalid lists and prevents another user changing destinations", async () => {
    const { t, owner, accountId, details } = await fixture();
    for (const countriesTo of [
      [],
      ["United States"],
      ["United Kingdom", "Canada"],
    ]) {
      await expect(
        owner.mutation(api.accounts.completeSetup, { ...details, countriesTo }),
      ).rejects.toThrow();
    }
    const otherId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "other@example.com" }),
    );
    await expect(
      t
        .withIdentity({ subject: `${otherId}|session` })
        .mutation(api.accounts.updateProfile, {
          ...details,
          accountId,
          financialStatus: "Planning",
          countriesTo: ["United Kingdom", "United States"],
        }),
    ).rejects.toThrow("Account access denied");
    expect(
      (await owner.query(api.accounts.bootstrap, {})).account.countriesTo,
    ).toBeUndefined();
  });
});

describe("university shortlists", () => {
  it("saves multiple universities across destinations and changes the active university with the primary destination", async () => {
    const { owner, details, accountId } = await fixture();
    const choices = [
      "University of Manchester",
      "University of Edinburgh",
      "UCLA",
    ];
    await owner.mutation(api.accounts.completeSetup, {
      ...details,
      countriesTo: ["UK", "US"],
      universityChoices: choices,
    });
    let result = await owner.query(api.accounts.bootstrap, {});
    expect(result.account.universityChoices).toEqual(choices);
    expect(result.account.university).toBe("University of Manchester");
    await owner.mutation(api.accounts.updateProfile, {
      ...details,
      accountId,
      financialStatus: "Planning",
      countryTo: "US",
      countriesTo: ["UK", "US"],
      universityChoices: choices,
    });
    result = await owner.query(api.accounts.bootstrap, {});
    expect(result.account.university).toBe("UCLA");
    expect(result.account.universityChoices).toEqual(choices);
    await owner.mutation(api.accounts.updateProfile, {
      ...details,
      accountId,
      financialStatus: "Planning",
      universityChoices: [],
    });
    result = await owner.query(api.accounts.bootstrap, {});
    expect(result.account.universityChoices).toEqual([]);
    expect(result.account.university).toBe("");
  });
  it("rejects universities outside selected destinations and unauthenticated writes", async () => {
    const { owner, details, t } = await fixture();
    await expect(
      owner.mutation(api.accounts.completeSetup, {
        ...details,
        universityChoices: ["UCLA"],
      }),
    ).rejects.toThrow("selected destinations");
    await expect(
      owner.mutation(api.accounts.completeSetup, {
        ...details,
        universityChoices: ["Harvard"],
      }),
    ).rejects.toThrow("listed universities");
    await expect(
      t.mutation(api.accounts.completeSetup, {
        ...details,
        universityChoices: ["University of Manchester"],
      }),
    ).rejects.toThrow();
  });
  it("saves and confirms a listed tuition recipient without account digits", async () => {
    const { t, owner, accountId } = await fixture();
    await t.run((ctx) =>
      ctx.db.insert("appConfig", {
        accountId,
        key: "banking",
        value: {
          paymentAmount: 100,
          recipient: "University of Manchester",
          recipientVerified: false,
        },
      }),
    );
    await owner.mutation(api.paymentPreferences.save, {
      sourceCurrency: "USD",
      targetCurrency: "GBP",
      amount: 200,
      recipient: "University of Edinburgh",
    });
    await owner.mutation(api.accounts.verifySandboxRecipient, { accountId });
    const result = await owner.query(api.accounts.bootstrap, {});
    expect(result.config.banking.recipient).toBe("University of Edinburgh");
    expect(result.config.banking.recipientAccountLast4).toBe("");
    expect(result.config.banking.recipientVerified).toBe(true);
    await expect(
      owner.mutation(api.accounts.updatePaymentDetails, {
        accountId,
        amount: 200,
        recipient: "Harvard",
      }),
    ).rejects.toThrow("listed university");
    await owner.mutation(api.accounts.updatePaymentDetails, {
      accountId,
      amount: 200,
      recipient: "University of Manchester",
    });
    expect(
      (await owner.query(api.accounts.bootstrap, {})).config.banking
        .recipientVerified,
    ).toBe(false);
  });
});
