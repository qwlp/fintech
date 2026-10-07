import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  convertMoney,
  currencyRate,
  studyCurrency,
  sandboxRouteGBPPerUSD,
} from "../shared/currency";

/** Rebase mutable plans atomically. Receipts, ledger debits and wallet balances
 * retain their original currencies. Unsent proposals must be reviewed again. */
export async function syncWorkspaceCurrency(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  country = account.countryTo,
) {
  if (account.role !== "Student" || (!country && !account.setupComplete))
    return;
  const currency = studyCurrency(country);
  const rows = await ctx.db
    .query("appConfig")
    .withIndex("by_account", (q) => q.eq("accountId", account._id))
    .collect();
  const profile = rows.find((row) => row.key === "profile");
  const previous =
    profile?.value?.workspaceCurrency ??
    profile?.value?.fundingCurrency ??
    "GBP";
  const convert = (value: number) => convertMoney(value, previous, currency);
  if (previous !== currency) {
    const costs = await ctx.db
      .query("costs")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    for (const row of costs)
      await ctx.db.patch(row._id, { amount: convert(row.amount) });
    const funding = await ctx.db
      .query("funding")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    for (const row of funding)
      await ctx.db.patch(row._id, { amount: convert(row.amount) });
    const sponsors = await ctx.db
      .query("sponsors")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    for (const row of sponsors)
      await ctx.db.patch(row._id, { commitment: convert(row.commitment) });
    const requests = await ctx.db
      .query("sponsorRequests")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    for (const row of requests)
      await ctx.db.patch(row._id, { amount: convert(row.amount) });
    const routes = await ctx.db
      .query("paymentRoutes")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    for (const row of routes)
      await ctx.db.patch(row._id, {
        fxRate:
          (row.sourceCurrency ?? "USD") === currency
            ? 1
            : sandboxRouteGBPPerUSD[row.key] !== undefined
              ? sandboxRouteGBPPerUSD[row.key] * currencyRate("GBP", currency)
              : row.fxRate * currencyRate(previous, currency),
        sourceCurrency: row.sourceCurrency ?? "USD",
        targetCurrency: currency,
        quoteExpiresAt: 0,
      });
    const proposals = await ctx.db
      .query("paymentProposals")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    for (const row of proposals)
      if (row.status === "prepared" || row.status === "approved")
        await ctx.db.patch(row._id, { status: "cancelled" });
    await ctx.db.patch(account._id, { paymentStatus: "not_started" });
    const alerts = await ctx.db
      .query("rateAlerts")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    for (const row of alerts)
      if (row.active) await ctx.db.patch(row._id, { active: false });
    for (const row of rows) {
      if (row.key === "profile") continue;
      const value = { ...row.value };
      const keys =
        row.key === "banking"
          ? ["paymentAmount"]
          : row.key === "security"
            ? ["paymentLimit", "protectedReserveGBP"]
            : row.key === "sponsorship"
              ? ["transferred"]
              : [];
      for (const key of keys)
        if (typeof value[key] === "number") value[key] = convert(value[key]);
      if (row.key === "sponsorship") {
        if (Array.isArray(value.categories))
          value.categories = value.categories.map((category: any[]) => [
            category[0],
            typeof category[1] === "number"
              ? convert(category[1])
              : category[1],
            ...category.slice(2),
          ]);
        if (Array.isArray(value.schedule))
          value.schedule = value.schedule.map((entry: any[]) => [
            entry[0],
            entry[1],
            typeof entry[2] === "number" ? convert(entry[2]) : entry[2],
            ...entry.slice(3),
          ]);
        value.currency = currency;
      }
      if (row.key === "move" && value.budgetAmounts)
        value.budgetAmounts = Object.fromEntries(
          Object.entries(value.budgetAmounts).map(([key, amount]) => [
            key,
            typeof amount === "number" ? convert(amount) : amount,
          ]),
        );
      if (row.key === "banking") {
        value.currency = currency;
        value.recipientVerified = false;
        if (country !== account.countryTo) {
          value.recipient = "";
          value.recipientAccountLast4 = "";
        }
      }
      if (row.key === "security") value.currency = currency;
      await ctx.db.patch(row._id, { value });
    }
    await ctx.db.insert("auditEvents", {
      accountId: account._id,
      type: "WORKSPACE_CURRENCY_CHANGED",
      detail: `Plan rebased from ${previous} to ${currency} using fixed illustrative sandbox valuations. Unsent payments cancelled; refresh quotes and confirm recipient.`,
      actor: account.name,
      timestamp: Date.now(),
    });
  }
  const value = {
    ...(profile?.value ?? {}),
    workspaceCurrency: currency,
    fundingCurrency: currency,
    studyCurrency: currency,
    ...(typeof profile?.value?.fundingAmount === "number"
      ? { fundingAmount: convert(profile.value.fundingAmount) }
      : {}),
  };
  if (profile) await ctx.db.patch(profile._id, { value });
  else
    await ctx.db.insert("appConfig", {
      accountId: account._id,
      key: "profile",
      value,
    });
}
