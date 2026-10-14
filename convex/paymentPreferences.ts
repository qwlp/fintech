import {
  internalMutation,
  mutation,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireAccount } from "./ownership";
import { providerPricing } from "../shared/payment-comparison";
import { convertMoney, currencyRate, studyCurrency } from "../shared/currency";
import { getUniversity, countries } from "../shared/study";
import { applyComparisonRates, rateObservation } from "./paymentRates";
const currency = v.union(v.literal("USD"), v.literal("GBP"), v.literal("CNY"));
const preferenceArgs = {
  sourceCurrency: currency,
  targetCurrency: currency,
  amount: v.number(),
  recipient: v.optional(v.string()),
  last4: v.optional(v.string()),
};
type Preferences = {
  sourceCurrency: "USD" | "GBP" | "CNY";
  targetCurrency: "USD" | "GBP" | "CNY";
  amount: number;
  recipient?: string;
  last4?: string;
};
async function persistPreferences(ctx: MutationCtx, args: Preferences) {
  const account = await requireAccount(ctx);
  if (account.role !== "Student") throw new Error("Student account required");
  if (account.paymentStatus !== "not_started")
    throw new Error("Reset the current payment before changing currencies");
  if (
    !Number.isFinite(args.amount) ||
    args.amount < 0.01 ||
    args.amount > convertMoney(1000000, "GBP", args.targetCurrency) ||
    Math.abs(args.amount * 100 - Math.round(args.amount * 100)) > 0.000001
  )
    throw new Error("Enter a valid payment amount");
  const rows = await ctx.db
    .query("appConfig")
    .withIndex("by_account", (q) => q.eq("accountId", account._id))
    .take(100);
  const banking = rows.find((row) => row.key === "banking");
  if (!banking) throw new Error("Set up a demo payment first");
  if (args.last4 && !/^\d{4}$/.test(args.last4))
    throw new Error("Invalid payment details");
  const recipientCountry = countries.find(
    (country) => country.currency === args.targetCurrency,
  )!.name;
  const recipient =
    getUniversity(
      recipientCountry,
      args.recipient ?? banking.value.recipient ?? "",
    ) ?? "";
  if (args.recipient !== undefined && !recipient)
    throw new Error("Choose a listed university in the Pay to country");
  const last4 =
    args.last4 ??
    (recipient === banking.value.recipient
      ? (banking.value.recipientAccountLast4 ?? "")
      : "");
  const routes = await ctx.db
    .query("paymentRoutes")
    .withIndex("by_account", (q) => q.eq("accountId", account._id))
    .take(50);
  for (const route of routes) {
    await ctx.db.patch(route._id, {
      sourceCurrency: args.sourceCurrency,
      targetCurrency: args.targetCurrency,
      ...providerPricing(
        route.provider,
        args.sourceCurrency,
        args.targetCurrency,
        args.amount,
        currencyRate(args.sourceCurrency, args.targetCurrency),
      ),
      quoteExpiresAt: 0,
    });
  }
  const changed =
    recipient !== banking.value.recipient ||
    last4 !== banking.value.recipientAccountLast4;
  await ctx.db.patch(banking._id, {
    value: {
      ...banking.value,
      studyCurrencyAtSelection: studyCurrency(account.countryTo),
      sourceCurrency: args.sourceCurrency,
      currency: args.targetCurrency,
      paymentAmount: args.amount,
      marketRates: [],
      recipient,
      recipientAccountLast4: last4,
      recipientVerified: changed
        ? false
        : (banking.value.recipientVerified ?? false),
    },
  });
  await ctx.db.insert("auditEvents", {
    accountId: account._id,
    type: "PAYMENT_DETAILS_UPDATED",
    detail: `Payment comparison updated: ${args.sourceCurrency} to ${args.targetCurrency}, ${args.amount.toLocaleString("en-US")} ${args.targetCurrency}.`,
    actor: account.name,
    timestamp: Date.now(),
  });
  return null;
}
export const save = mutation({
  args: preferenceArgs,
  returns: v.null(),
  handler: persistPreferences,
});
export const saveWithMarketRate = internalMutation({
  args: { ...preferenceArgs, rates: v.array(rateObservation) },
  returns: v.null(),
  handler: async (ctx, { rates, ...args }) => {
    await persistPreferences(ctx, args);
    await applyComparisonRates(ctx, rates);
    return null;
  },
});
