import { v } from "convex/values";
import {
  action,
  internalQuery,
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAccount } from "./ownership";
import { getCountry } from "../shared/study";
import { studyCurrency } from "../shared/currency";
import { providerPricing } from "../shared/payment-comparison";

export const rateObservation = v.object({
  date: v.string(),
  base: v.string(),
  quote: v.string(),
  rate: v.number(),
  sourceUrl: v.optional(v.string()),
  sourceLabel: v.optional(v.string()),
});
export type RateObservation = {
  date: string;
  base: string;
  quote: string;
  rate: number;
  sourceUrl?: string;
  sourceLabel?: string;
};
const currency = v.union(v.literal("USD"), v.literal("GBP"), v.literal("CNY"));

async function fetchFrankfurterRates(
  source: string,
  target: string,
): Promise<RateObservation[]> {
  const today = new Date().toISOString().slice(0, 10);
  if (source === target)
    return [{ date: today, base: source, quote: target, rate: 1 }];
  const url = new URL("https://api.frankfurter.dev/v2/rates");
  url.searchParams.set("base", source);
  url.searchParams.set("quotes", target);
  url.searchParams.set(
    "from",
    new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
  );
  url.searchParams.set("to", today);
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error("Exchange rate unavailable. Try again.");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload))
    throw new Error("Invalid exchange rate response");
  const rates = payload
    .filter(
      (row): row is RateObservation =>
        row &&
        row.base === source &&
        row.quote === target &&
        typeof row.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
        Number.isFinite(Date.parse(row.date)) &&
        new Date(row.date).toISOString().slice(0, 10) === row.date &&
        row.date <= today &&
        Number.isFinite(row.rate) &&
        row.rate > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-15);
  const latest = rates.at(-1);
  if (!latest || Date.parse(today) - Date.parse(latest.date) > 7 * 86400000)
    throw new Error("No recent exchange rate available. Try again.");
  return rates;
}
const ecbUrl =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml";
export async function fetchComparisonRates(
  source: string,
  target: string,
): Promise<RateObservation[]> {
  try {
    return await fetchFrankfurterRates(source, target);
  } catch {
    // Keep a verifiable daily reference available if the JSON service is down.
    const response = await fetch(ecbUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Exchange rate unavailable. Try again.");
    const xml = await response.text();
    const today = new Date().toISOString().slice(0, 10);
    const rates: RateObservation[] = [];
    for (const day of xml.matchAll(
      /<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]\s*>([\s\S]*?)<\/Cube>/g,
    )) {
      const values: Record<string, number> = { EUR: 1 };
      for (const entry of day[2].matchAll(
        /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g,
      ))
        values[entry[1]] = Number(entry[2]);
      const rate = Math.round((values[target] / values[source]) * 1e8) / 1e8;
      if (day[1] <= today && Number.isFinite(rate) && rate > 0)
        rates.push({
          date: day[1],
          base: source,
          quote: target,
          rate,
          sourceUrl:
            "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html",
          sourceLabel: "European Central Bank daily reference rates",
        });
    }
    rates.sort((a, b) => a.date.localeCompare(b.date));
    const latest = rates.at(-1);
    if (!latest || Date.parse(today) - Date.parse(latest.date) > 7 * 86400000)
      throw new Error("No recent exchange rate available. Try again.");
    return rates.slice(-15);
  }
}
export const reference = internalAction({
  args: { sourceCurrency: currency, targetCurrency: currency },
  returns: v.array(rateObservation),
  handler: async (_ctx, args) =>
    fetchComparisonRates(args.sourceCurrency, args.targetCurrency),
});
export const selection = internalQuery({
  args: {},
  returns: v.object({
    sourceCurrency: currency,
    targetCurrency: currency,
    amount: v.number(),
  }),
  handler: async (ctx) => {
    const account = await requireAccount(ctx);
    if (account.role !== "Student") throw new Error("Student account required");
    if (account.paymentStatus !== "not_started")
      throw new Error("Reset the current payment before refreshing rates");
    const rows = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .take(100);
    const banking = rows.find((row) => row.key === "banking")?.value;
    if (!banking) throw new Error("Set up a payment first");
    const routes = await ctx.db
      .query("paymentRoutes")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .take(1);
    return {
      sourceCurrency:
        banking.sourceCurrency ??
        routes[0]?.sourceCurrency ??
        getCountry(account.countryFrom)?.currency ??
        "USD",
      targetCurrency: banking.currency ?? studyCurrency(account.countryTo),
      amount: banking.paymentAmount ?? 0,
    };
  },
});

// Called only by authenticated internal mutations, never with a client-supplied rate.
export async function applyComparisonRates(
  ctx: MutationCtx,
  rates: RateObservation[],
) {
  const account = await requireAccount(ctx);
  if (account.role !== "Student") throw new Error("Student account required");
  if (account.paymentStatus !== "not_started")
    throw new Error("Reset the current payment before refreshing rates");
  const latest = rates.at(-1);
  if (!latest) throw new Error("No exchange rate available");
  const rows = await ctx.db
    .query("appConfig")
    .withIndex("by_account", (q) => q.eq("accountId", account._id))
    .take(100);
  const banking = rows.find((row) => row.key === "banking");
  if (!banking) throw new Error("Set up a payment first");
  const routes = await ctx.db
    .query("paymentRoutes")
    .withIndex("by_account", (q) => q.eq("accountId", account._id))
    .take(50);
  const source =
    banking.value.sourceCurrency ??
    routes[0]?.sourceCurrency ??
    getCountry(account.countryFrom)?.currency ??
    "USD";
  const target = banking.value.currency ?? studyCurrency(account.countryTo);
  if (latest.base !== source || latest.quote !== target)
    throw new Error("Payment currencies changed. Compare again.");
  const now = Date.now();
  for (const route of routes) {
    const pricing = providerPricing(
      route.provider,
      source,
      target,
      banking.value.paymentAmount ?? 0,
      latest.rate,
    );
    await ctx.db.patch(route._id, {
      sourceCurrency: source,
      targetCurrency: target,
      ...pricing,
      quotedAt: now,
      quoteExpiresAt: now + 600000,
    });
  }
  await ctx.db.patch(banking._id, {
    value: {
      ...banking.value,
      marketRates: rates,
      marketRateSource:
        latest.sourceLabel ?? "Frankfurter daily reference rates",
      marketRateSourceUrl: latest.sourceUrl ?? "https://frankfurter.dev/",
      marketRateFetchedAt: now,
    },
  });
  await ctx.db.insert("auditEvents", {
    accountId: account._id,
    type: "PAYMENT_RATE_REFRESHED",
    detail: `Comparison uses ${latest.base}/${latest.quote} daily reference ${latest.rate} from ${latest.date}; provider fees remain illustrative.`,
    actor: account.name,
    timestamp: now,
  });
}
export const apply = internalMutation({
  args: { rates: v.array(rateObservation) },
  returns: v.null(),
  handler: async (ctx, { rates }) => {
    await applyComparisonRates(ctx, rates);
    return null;
  },
});
export const refresh = action({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const current = await ctx.runQuery(internal.paymentRates.selection, {});
    const rates = await fetchComparisonRates(
      current.sourceCurrency,
      current.targetCurrency,
    );
    await ctx.runMutation(internal.paymentRates.apply, { rates });
    return null;
  },
});
export const compare = action({
  args: {
    sourceCurrency: currency,
    targetCurrency: currency,
    amount: v.number(),
    recipient: v.optional(v.string()),
    last4: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.runQuery(internal.paymentRates.selection, {});
    const rates = await fetchComparisonRates(
      args.sourceCurrency,
      args.targetCurrency,
    );
    await ctx.runMutation(internal.paymentPreferences.saveWithMarketRate, {
      ...args,
      rates,
    });
    return null;
  },
});
