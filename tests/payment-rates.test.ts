import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { providerPricing } from "../shared/payment-comparison";
import { tuitionQuote } from "../convex/tuitionDecision";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => {
  vi.unstubAllGlobals();
});
async function fixture() {
  const t = convexTest(schema, modules);
  const { userId, accountId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "rate@example.test" });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "rate@example.test",
      name: "Student",
      initials: "S",
      role: "Student",
      planName: "Study",
      countryFrom: "United Kingdom",
      countryTo: "United States",
      university: "UCLA",
      course: "Course",
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
    });
    return { userId, accountId };
  });
  const owner = t.withIdentity({ subject: `${userId}|session` });
  await owner.mutation(api.accounts.initializePaymentSandbox, { accountId });
  return { t, accountId, owner };
}
function mockRates(rate = 1.3241) {
  const date = new Date().toISOString().slice(0, 10);
  const observations = [{ date, base: "GBP", quote: "USD", rate }];
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify(observations), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetch);
  return { observations, fetch };
}
it("uses one saved daily reference for the screenshot pair and every route's total", async () => {
  const { owner, accountId } = await fixture();
  const { observations } = mockRates();
  await owner.action(api.paymentRates.compare, {
    sourceCurrency: "GBP",
    targetCurrency: "USD",
    amount: 50000,
  });
  const state = await owner.query(api.accounts.bootstrap, {});
  expect(state.config.banking.marketRates).toEqual(observations);
  await owner.mutation(api.accounts.refreshSandboxQuotes, { accountId });
  const refreshed = await owner.query(api.accounts.bootstrap, {});
  expect(
    refreshed.paymentRoutes.every(
      (route) =>
        route.fxRate ===
        providerPricing(route.provider, "GBP", "USD", 50000, 1.3241).fxRate,
    ),
  ).toBe(true);

  for (const route of state.paymentRoutes) {
    const pricing = providerPricing(
      route.provider,
      "GBP",
      "USD",
      50000,
      1.3241,
    );
    expect(route.fxRate).toBe(pricing.fxRate);
    expect(route.fee).toBe(pricing.fee);
    expect(route.sourceCurrency).toBe("GBP");
    expect(route.targetCurrency).toBe("USD");
    const quote = tuitionQuote(50000, route);
    expect(quote.sourceMinor).toBe(Math.round(pricing.sourceAmount * 100));
    expect(quote.totalMinor).toBe(
      quote.sourceMinor + Math.round(route.fee * 100),
    );
    expect(route.sourceAmount).toBe(pricing.sourceAmount);
  }
});
it("refreshes the daily reference, cards and source amounts together", async () => {
  const { owner } = await fixture();
  mockRates();
  await owner.action(api.paymentRates.compare, {
    sourceCurrency: "GBP",
    targetCurrency: "USD",
    amount: 50000,
  });
  const { observations } = mockRates(1.25);
  await owner.action(api.paymentRates.refresh, {});
  const state = await owner.query(api.accounts.bootstrap, {});
  expect(state.config.banking.marketRates).toEqual(observations);
  expect(
    state.paymentRoutes.every(
      (route) =>
        route.fxRate ===
          providerPricing(route.provider, "GBP", "USD", 50000, 1.25).fxRate &&
        route.sourceAmount ===
          providerPricing(route.provider, "GBP", "USD", 50000, 1.25)
            .sourceAmount,
    ),
  ).toBe(true);
});
it("does not fetch FX for a same-currency comparison", async () => {
  const { owner } = await fixture();
  const { fetch } = mockRates();
  await owner.action(api.paymentRates.compare, {
    sourceCurrency: "USD",
    targetCurrency: "USD",
    amount: 1234.56,
  });
  const state = await owner.query(api.accounts.bootstrap, {});
  expect(fetch).not.toHaveBeenCalled();
  expect(
    state.paymentRoutes.every(
      (route) => route.fxRate === 1 && route.sourceAmount === 1234.56,
    ),
  ).toBe(true);
});
it("rejects anonymous and locked payments and keeps previous quotes when rates fail", async () => {
  const { t, owner, accountId } = await fixture();
  mockRates();
  await owner.action(api.paymentRates.compare, {
    sourceCurrency: "GBP",
    targetCurrency: "USD",
    amount: 50000,
  });
  await expect(t.action(api.paymentRates.refresh, {})).rejects.toThrow();
  const before = await owner.query(api.accounts.bootstrap, {});
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })),
  );
  await expect(
    owner.action(api.paymentRates.compare, {
      sourceCurrency: "GBP",
      targetCurrency: "USD",
      amount: 999,
    }),
  ).rejects.toThrow("unavailable");
  expect(
    (await owner.query(api.accounts.bootstrap, {})).config.banking,
  ).toEqual(before.config.banking);
  await t.run(async (ctx) => {
    await ctx.db.patch(accountId, { paymentStatus: "prepared" });
  });
  await expect(owner.action(api.paymentRates.refresh, {})).rejects.toThrow(
    "Reset",
  );
});
it("rounds decimal FX once without adding a floating-point penny", () => {
  expect(tuitionQuote(0.33, { fee: 0, fxRate: 0.3 }).sourceMinor).toBe(110);
  expect(tuitionQuote(1, { fee: 0.01, fxRate: 3 }).totalMinor).toBe(35);
  expect(() => tuitionQuote(100, { fee: 0, fxRate: 0 })).toThrow();
});

it("falls back to published ECB cross rates and keeps their source attribution", async () => {
  const { owner } = await fixture();
  const date = new Date().toISOString().slice(0, 10);
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
    .mockResolvedValueOnce(
      new Response(
        `<Envelope><Cube><Cube time='${date}'><Cube currency='USD' rate='1.20'/><Cube currency='GBP' rate='0.80'/><Cube currency='CNY' rate='8.50'/></Cube></Cube></Envelope>`,
        { status: 200 },
      ),
    );
  vi.stubGlobal("fetch", fetch);
  await owner.action(api.paymentRates.compare, {
    sourceCurrency: "GBP",
    targetCurrency: "USD",
    amount: 50000,
  });
  const state = await owner.query(api.accounts.bootstrap, {});
  expect(state.config.banking.marketRateSource).toBe(
    "European Central Bank daily reference rates",
  );
  expect(state.config.banking.marketRateSourceUrl).toContain("ecb.europa.eu");
  expect(state.config.banking.marketRates.at(-1).rate).toBe(1.5);
  expect(
    state.paymentRoutes.every(
      (route) =>
        route.fxRate ===
          providerPricing(route.provider, "GBP", "USD", 50000, 1.5).fxRate &&
        route.sourceAmount ===
          providerPricing(route.provider, "GBP", "USD", 50000, 1.5)
            .sourceAmount,
    ),
  ).toBe(true);
});

it("prices USD to GBP with a transparent fintech fee and embedded provider spreads", () => {
  const fintech = providerPricing("Wise", "USD", "GBP", 50000, 0.75496);
  expect(fintech).toEqual({
    fxRate: 0.75496,
    fee: 231.8,
    sourceAmount: 66228.68,
  });
  expect(tuitionQuote(50000, fintech).totalMinor).toBe(6646048);
  const platform = providerPricing(
    "Education Platforms",
    "USD",
    "GBP",
    50000,
    0.75496,
  );
  expect(platform.fxRate).toBe(0.7436356);
  expect(platform.fee).toBe(0);
  expect(tuitionQuote(50000, platform).totalMinor).toBe(6723724);
  const bank = providerPricing(
    "SWIFT bank transfer",
    "USD",
    "GBP",
    50000,
    0.75496,
  );
  expect(bank.fxRate).toBe(0.736086);
  expect(bank.fee).toBe(40);
  const chinese = providerPricing("Bank & Card", "CNY", "GBP", 50000, 0.1);
  expect(chinese.fxRate).toBe(0.0997);
  expect(chinese.fee).toBe(250);
  expect(providerPricing("Bank & Card", "GBP", "USD", 50000, 1.3).fee).toBe(
    30.96,
  );
  expect(providerPricing("Wise", "USD", "GBP", 10000, 0.75496).fee).toBe(46.36);
});

it("applies Chinese sending-bank prices and recalculates percentage fees when the amount changes", async () => {
  const { owner, accountId } = await fixture();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify([
            {
              date: new Date().toISOString().slice(0, 10),
              base: "CNY",
              quote: "GBP",
              rate: 0.1,
            },
          ]),
        ),
    ),
  );
  for (const amount of [50000, 10000]) {
    await owner.action(api.paymentRates.compare, {
      sourceCurrency: "CNY",
      targetCurrency: "GBP",
      amount,
    });
    await owner.mutation(api.accounts.refreshSandboxQuotes, { accountId });
    const state = await owner.query(api.accounts.bootstrap, {});
    for (const route of state.paymentRoutes) {
      const expected = providerPricing(
        route.provider,
        "CNY",
        "GBP",
        amount,
        0.1,
      );
      expect(route).toMatchObject(expected);
      expect(tuitionQuote(amount, route).totalMinor).toBe(
        Math.round((expected.sourceAmount + expected.fee) * 100),
      );
    }
  }
});
