import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import {
  comparisonRoute,
  paymentOptionScore,
} from "../shared/payment-comparison";
import { currencyRate } from "../shared/currency";
const modules = import.meta.glob("../convex/**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules);
  const { accountId, userId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "currencies@example.test",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "currencies@example.test",
      name: "Student",
      initials: "S",
      role: "Student",
      planName: "Study",
      countryFrom: "China",
      countryTo: "UK",
      university: "University of Manchester",
      course: "Course",
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
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
describe("payment currencies and scores", () => {
  it("converts quotes with the same spread and no FX for the same currency", () => {
    const converted = comparisonRoute(
      { fxRate: 0.768, fee: 34, sourceCurrency: "USD", targetCurrency: "GBP" },
      "CNY",
      "USD",
    );
    expect(converted.fxRate).toBeCloseTo(
      (currencyRate("CNY", "USD") * 0.768) / 0.774,
    );
    expect(converted.fee).toBeGreaterThan(34);
    expect(comparisonRoute(converted, "CNY", "CNY").fxRate).toBe(1);
  });
  it("scores cost, speed, availability and freshness", () => {
    expect(
      paymentOptionScore(
        { totalUSD: 100, eligible: true, fresh: true },
        100,
        1,
      ),
    ).toBe(10);
    expect(
      paymentOptionScore(
        { totalUSD: 200, eligible: true, fresh: true },
        100,
        5,
      ),
    ).toBe(6.5);
    expect(
      paymentOptionScore(
        { totalUSD: 100, eligible: false, fresh: false },
        100,
        1,
      ),
    ).toBe(7);
  });
  it("saves the pair, prepares and executes in the selected currencies", async () => {
    const { t, owner, accountId } = await fixture();
    await t.run(async (ctx) => {
      await ctx.db.insert("wallets", {
        accountId,
        currency: "CNY",
        symbol: "¥",
        label: "Home balance",
        amount: 100000,
        gbpValue: 100000 / 9.2,
      });
    });
    await owner.mutation(api.paymentPreferences.save, {
      sourceCurrency: "CNY",
      targetCurrency: "USD",
      amount: 2000,
    });
    await owner.mutation(api.accounts.refreshSandboxQuotes, { accountId });
    const routes = await t.run((ctx) =>
      ctx.db
        .query("paymentRoutes")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
    );
    expect(
      routes.every(
        (route) =>
          route.sourceCurrency === "CNY" && route.targetCurrency === "USD",
      ),
    ).toBe(true);
    const proposal = await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "prepared",
    });
    expect(proposal!.sourceCurrency).toBe("CNY");
    expect(proposal!.targetCurrency).toBe("USD");
    expect(proposal!.amountMinor).toBe(200000);
    await expect(
      owner.mutation(api.paymentPreferences.save, {
        sourceCurrency: "USD",
        targetCurrency: "GBP",
        amount: 2000,
      }),
    ).rejects.toThrow("Reset");
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal!._id,
    });
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "completed",
      proposalId: proposal!._id,
    });
    const ledger = await t.run((ctx) =>
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .first(),
    );
    expect(ledger!.currency).toBe("CNY");
    expect(ledger!.receivedCurrency).toBe("USD");
  });
  it("requires an authenticated owner", async () => {
    const { t } = await fixture();
    await expect(
      t.mutation(api.paymentPreferences.save, {
        sourceCurrency: "CNY",
        targetCurrency: "USD",
        amount: 2000,
      }),
    ).rejects.toThrow();
  });
});

it("keeps an unchanged currency pair's exact quoted rate", () => {
  const route = {
    fxRate: 1.324073,
    fee: 8.5,
    sourceCurrency: "GBP",
    targetCurrency: "USD",
  };
  expect(comparisonRoute(route, "GBP", "USD")).toBe(route);
});
