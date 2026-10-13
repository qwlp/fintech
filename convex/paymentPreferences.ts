import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAccount } from "./ownership";
import { comparisonRoute } from "../shared/payment-comparison";
import { convertMoney, studyCurrency } from "../shared/currency";
import { getUniversity } from "../shared/study";
const currency = v.union(v.literal("USD"), v.literal("GBP"), v.literal("CNY"));
export const save = mutation({
  args: {
    sourceCurrency: currency,
    targetCurrency: currency,
    amount: v.number(),
    recipient: v.optional(v.string()),
    last4: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
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
    if (args.last4 && !/^\d{4}$/.test(args.last4)) throw new Error("Invalid payment details");
    const recipient =
      args.recipient == null
        ? banking.value.recipient
        : getUniversity(account.countryTo, args.recipient);
    const last4 = args.last4 ?? banking.value.recipientAccountLast4 ?? "";
    if (!recipient) throw new Error("Choose your university first");
    const routes = await ctx.db
      .query("paymentRoutes")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .take(50);
    for (const route of routes) {
      const converted = comparisonRoute(
        route,
        args.sourceCurrency,
        args.targetCurrency,
      );
      await ctx.db.patch(route._id, {
        sourceCurrency: args.sourceCurrency,
        targetCurrency: args.targetCurrency,
        fee: converted.fee,
        fxRate: converted.fxRate,
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
  },
});
