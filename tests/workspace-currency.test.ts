import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { countries } from "../shared/study";
import { convertMoney, currencyRate, walletValue } from "../shared/currency";
import { assessTuition, quoteFingerprint } from "../convex/tuitionDecision";
const modules = import.meta.glob("../convex/**/*.ts");
async function fixture(country: string) {
  const t = convexTest(schema, modules);
  const { accountId, userId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "currency@example.com",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "currency@example.com",
      name: "Student",
      initials: "S",
      role: "Student",
      planName: "Study",
      countryFrom: "Cambodia",
      countryTo: country,
      university: "My university",
      course: "Course",
      setupComplete: true,
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
    });
    await ctx.db.insert("costs", {
      accountId,
      key: "tuition",
      name: "Tuition",
      category: "Recurring",
      amount: 6000,
      due: "Soon",
    });
    await ctx.db.insert("funding", {
      accountId,
      key: "savings",
      name: "Savings",
      type: "Savings",
      amount: 1000,
      status: "confirmed",
      available: "Now",
    });
    await ctx.db.insert("appConfig", {
      accountId,
      key: "profile",
      value: { fundingAmount: 1000, fundingCurrency: "GBP" },
    });
    return { accountId, userId };
  });
  const owner = t.withIdentity({ subject: `${userId}|session` });
  await owner.mutation(api.accounts.initializePaymentSandbox, { accountId });
  await owner.mutation(api.accounts.verifySandboxRecipient, {
    accountId,
    last4: "1842",
  });
  return { t, owner, accountId };
}
const profile = (accountId: any, countryTo: string, fundingAmount: number) => ({
  accountId,
  name: "Student",
  countryFrom: "Cambodia",
  countryTo,
  university: "",
  course: "Course",
  courseStart: "",
  financialStatus: "Planning",
  sponsorSupport: "Yes",
  fundingAmount,
});

describe("workspace currency accounting", () => {
  it.each(countries)(
    "rebases legacy budgets and completes a payment in $currency",
    async ({ name, currency }) => {
      const { owner, accountId } = await fixture(name);
      let state = await owner.query(api.accounts.bootstrap, {});
      expect(state.config.profile).toMatchObject({
        workspaceCurrency: currency,
        fundingCurrency: currency,
        fundingAmount: convertMoney(1000, "GBP", currency),
      });
      expect(state.costs[0].amount).toBe(convertMoney(6000, "GBP", currency));
      expect(state.funding[0].amount).toBe(convertMoney(1000, "GBP", currency));
      expect(state.config.banking).toMatchObject({
        currency,
        paymentAmount: convertMoney(2000, "GBP", currency),
        recipient: "My university",
      });
      expect(state.config.security.paymentLimit).toBe(
        convertMoney(2500, "GBP", currency),
      );
      const route = state.paymentRoutes[0];
      expect(route).toMatchObject({
        sourceCurrency: "USD",
        targetCurrency: currency,
      });
      expect(route.fxRate).toBeCloseTo(0.774 * currencyRate("GBP", currency));
      if (currency === "USD")
        expect(state.paymentRoutes.every((r) => r.fxRate === 1)).toBe(true);
      const decision = assessTuition({
        currency,
        amountGBP: state.config.banking.paymentAmount,
        reserveGBP: state.config.security.protectedReserveGBP,
        wallets: state.wallets,
        routes: state.paymentRoutes,
        deadline: state.config.banking.tuitionDeadline,
        now: Date.now(),
      });
      expect(decision.currency).toBe(currency);
      expect(decision.routes[0].eligible).toBe(true);
      const proposal = (await owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "prepared",
      }))!;
      expect(proposal.targetCurrency).toBe(currency);
      expect(proposal.amountMinor).toBe(
        Math.round(convertMoney(2000, "GBP", currency) * 100),
      );
      await owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "approved",
        proposalId: proposal._id,
      });
      await owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "completed",
        proposalId: proposal._id,
      });
      state = await owner.query(api.accounts.bootstrap, {});
      expect(state.ledgerEntries[0]).toMatchObject({
        currency: "USD",
        receivedCurrency: currency,
        receivedMinor: proposal.amountMinor,
        debitMinor: proposal.totalMinor,
      });
      expect(state.wallets[0].amount).toBe(
        (500000 - proposal.totalMinor) / 100,
      );
      expect(walletValue(state.wallets[0], currency)).toBeCloseTo(
        state.wallets[0].amount * currencyRate("USD", currency),
        2,
      );
      const funding = state.config.profile.fundingAmount;
      await owner.mutation(api.accounts.ensureConfig, { accountId });
      await owner.mutation(api.accounts.ensureConfig, { accountId });
      expect(
        (await owner.query(api.accounts.bootstrap, {})).config.profile
          .fundingAmount,
      ).toBe(funding);
    },
  );
  it("cancels an approved payment on destination change and preserves native balances", async () => {
    const { owner, accountId } = await fixture("Canada");
    const proposal = (await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "prepared",
    }))!;
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal._id,
    });
    const before = await owner.query(api.accounts.bootstrap, {});
    await owner.mutation(
      api.accounts.updateProfile,
      profile(accountId, "Germany", convertMoney(1000, "GBP", "EUR")),
    );
    const after = await owner.query(api.accounts.bootstrap, {});
    expect(after.account.paymentStatus).toBe("not_started");
    expect(after.paymentProposals[0]).toMatchObject({
      status: "cancelled",
      targetCurrency: "CAD",
      amountMinor: proposal.amountMinor,
    });
    expect(after.wallets).toEqual(before.wallets);
    expect(after.config.banking).toMatchObject({
      currency: "EUR",
      paymentAmount: 2340,
      recipientVerified: false,
      recipient: "",
      recipientAccountLast4: "",
    });
    expect(
      after.paymentRoutes.every(
        (r) => r.targetCurrency === "EUR" && r.quoteExpiresAt === 0,
      ),
    ).toBe(true);
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "completed",
        proposalId: proposal._id,
      }),
    ).rejects.toThrow();
    expect(
      (await owner.query(api.accounts.bootstrap, {})).ledgerEntries,
    ).toHaveLength(0);
  });
  it("keeps completed receipts in their original currency after rebasing a plan", async () => {
    const { owner, accountId } = await fixture("Australia");
    const proposal = (await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "prepared",
    }))!;
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal._id,
    });
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "completed",
      proposalId: proposal._id,
    });
    const before = await owner.query(api.accounts.bootstrap, {});
    await owner.mutation(
      api.accounts.updateProfile,
      profile(accountId, "China", 9200),
    );
    const after = await owner.query(api.accounts.bootstrap, {});
    expect(after.ledgerEntries).toEqual(before.ledgerEntries);
    expect(after.paymentProposals[0]).toMatchObject({
      status: "completed",
      targetCurrency: "AUD",
      amountMinor: 390000,
    });
    expect(after.config.profile.workspaceCurrency).toBe("CNY");
  });
  it("includes the currency pair in consent fingerprints and rejects mismatched quotes", () => {
    const route = {
      key: "test",
      provider: "Test",
      fee: 0,
      fxRate: 1,
      delivery: "1 day",
      sourceCurrency: "USD",
      targetCurrency: "CAD",
      quotedAt: 1,
      quoteExpiresAt: 100,
      maxBusinessDays: 1,
    };
    expect(quoteFingerprint(100, "Recipient", "1234", route)).not.toBe(
      quoteFingerprint(100, "Recipient", "1234", {
        ...route,
        targetCurrency: "EUR",
      }),
    );
    const result = assessTuition({
      currency: "EUR",
      amountGBP: 100,
      reserveGBP: 0,
      wallets: [{ currency: "USD", amount: 1000, gbpValue: 774 }],
      routes: [route],
      deadline: "2030-01-01",
      now: 2,
    });
    expect(result.routes[0].eligible).toBe(false);
    expect(result.routes[0].blockers).toContain(
      "Quote currency does not match study currency",
    );
  });
});

it("refreshes known legacy demo routes in the study currency without refreshing unknown providers", async () => {
  const { t, owner, accountId } = await fixture("China");
  await t.run(async ctx => {
    const routes = await ctx.db.query("paymentRoutes").collect();
    const aliases: Record<string, string> = { "sandbox-standard": "wise", "sandbox-bank": "swift", "sandbox-fast": "card" };
    for (const route of routes) await ctx.db.patch(route._id, { key: aliases[route.key], fxRate: 0.1, quoteExpiresAt: 0, maxBusinessDays: undefined });
    await ctx.db.insert("paymentRoutes", { accountId, key: "unknown-provider", provider: "Unknown", fxRate: 1, fee: 0, sourceAmount: 1, delivery: "Unknown", quoteExpiresAt: 0 });
  });
  await owner.mutation(api.accounts.refreshSandboxQuotes, { accountId });
  const routes = await t.run(ctx => ctx.db.query("paymentRoutes").collect());
  for (const route of routes.filter(r => r.key !== "unknown-provider")) {
    expect(route.targetCurrency).toBe("CNY");
    expect(route.sourceCurrency).toBe("USD");
    expect(route.quoteExpiresAt).toBeGreaterThan(Date.now());
    expect(route.maxBusinessDays).toBeGreaterThan(0);
    expect(route.fxRate).toBeGreaterThan(7);
  }
  expect(routes.find(r => r.key === "unknown-provider")?.quoteExpiresAt).toBe(0);
});
