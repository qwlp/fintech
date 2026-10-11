import { convertMoney, studyCurrency, walletValue } from "../shared/currency";
import { routeProviderName } from "../shared/payment-routes";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAccount } from "./ownership";
import {
  assessTuition,
  tuitionQuote,
  quoteFingerprint,
} from "./tuitionDecision";

export const cents = (value: number) => Math.round(value * 100);
export async function paymentTransition(
  ctx: MutationCtx,
  accountId: Id<"accounts">,
  next: "prepared" | "approved" | "completed",
  expectedProposalId?: Id<"paymentProposals">,
  expectedQuote?: string,
) {
  const account = await requireAccount(ctx, accountId);
  const study = studyCurrency(account.countryTo);
  const configs = await ctx.db
    .query("appConfig")
    .withIndex("by_account", (q) => q.eq("accountId", accountId))
    .take(100);
  const paymentConfig = configs.find((row) => row.key === "banking")?.value;
  const currency = paymentConfig?.currency ?? study;
  if (
    (paymentConfig?.studyCurrencyAtSelection &&
      paymentConfig.studyCurrencyAtSelection !== study) ||
    (!paymentConfig?.sourceCurrency && currency !== study)
  )
    throw new Error("Study currency changed. Prepare a new payment");
  if (account.role !== "Student") throw new Error("Student account required");
  if (next === "completed" && expectedProposalId) {
    const previous = await ctx.db.get(expectedProposalId);
    if (previous?.accountId === accountId && previous.status === "completed")
      return previous;
  }
  const proposals = await ctx.db
    .query("paymentProposals")
    .withIndex("by_account", (q) => q.eq("accountId", accountId))
    .order("desc")
    .collect();
  const proposal = proposals.sort((a, b) => b.createdAt - a.createdAt)[0];
  // Retrying execution of the same proposal returns its original receipt.
  if (
    next === "completed" &&
    proposal?.status === "completed" &&
    expectedProposalId === proposal._id
  )
    return proposal;
  if (next !== "prepared" && (!proposal || expectedProposalId !== proposal._id))
    throw new Error("Review the current payment proposal before continuing");
  if (next === "prepared") {
    if (account.paymentStatus !== "not_started")
      throw new Error("Reset the payment before preparing another proposal");
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const banking = config.find((row) => row.key === "banking")?.value;
    const security = config.find((row) => row.key === "security")?.value;
    const route = (
      await ctx.db
        .query("paymentRoutes")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect()
    ).find((row) => row.key === account.selectedRoute);
    const amount = banking?.paymentAmount;
    if (route && (route.targetCurrency ?? "GBP") !== currency)
      throw new Error("Refresh quotes for your study currency");
    const sourceCurrency = route?.sourceCurrency ?? "USD";
    if (
      expectedQuote &&
      (!route ||
        expectedQuote !==
          quoteFingerprint(
            amount,
            banking.recipient,
            banking.recipientAccountLast4,
            route,
          ))
    )
      throw new Error(
        "Quote or payment details changed. Review the new terms before continuing",
      );
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !route ||
      !Number.isFinite(route.fxRate) ||
      route.fxRate <= 0 ||
      !Number.isFinite(route.fee) ||
      route.fee < 0
    )
      throw new Error("Payment details unavailable");
    if (
      !banking?.recipient ||
      !banking?.recipientAccountLast4 ||
      banking.recipientVerified !== true
    )
      throw new Error("Verify the sandbox university recipient first");
    const limit =
      security?.paymentLimit == null
        ? convertMoney(2500, "GBP", currency)
        : convertMoney(security.paymentLimit, study, currency);
    if (!Number.isFinite(limit) || amount > limit)
      throw new Error("Payment exceeds the sandbox transaction limit");
    const { amountMinor, sourceMinor, feeMinor, totalMinor } = tuitionQuote(
      amount,
      route,
    );
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const reserveMinor = cents(
      security?.protectedReserveGBP == null
        ? convertMoney(1000, "GBP", currency)
        : convertMoney(security.protectedReserveGBP, study, currency),
    );
    if (!Number.isSafeInteger(reserveMinor) || reserveMinor < 0)
      throw new Error("Invalid protected reserve");
    const wallet = wallets.find((w) => w.currency === sourceCurrency);
    if (!wallet || cents(wallet.amount) < sourceMinor + feeMinor)
      throw new Error(`Insufficient sandbox ${sourceCurrency} funds`);
    const remainingGBPMinor = cents(
      wallets.reduce((sum, w) => sum + walletValue(w, currency), 0) -
        ((sourceMinor + feeMinor) / 100) *
          (walletValue(wallet, currency) / wallet.amount),
    );
    if (!Number.isSafeInteger(remainingGBPMinor))
      throw new Error("Wallet valuations unavailable");
    if (remainingGBPMinor < reserveMinor)
      throw new Error("Payment would use your protected living-cost reserve");
    const now = Date.now();
    const decision = assessTuition({
      currency,
      amountGBP: amount,
      reserveGBP: reserveMinor / 100,
      wallets,
      routes: [route],
      deadline: banking.tuitionDeadline,
      bufferBusinessDays: banking.bufferBusinessDays ?? 1,
      now,
    }).routes[0];
    if (!decision.eligible) throw new Error(decision.blockers.join("; "));
    const id = await ctx.db.insert("paymentProposals", {
      accountId,
      recipient: banking.recipient,
      recipientLast4: banking.recipientAccountLast4,
      routeKey: route.key,
      provider: routeProviderName(route.provider),
      fxRate: route.fxRate,
      sourceCurrency,
      targetCurrency: currency,
      amountMinor,
      sourceMinor,
      feeMinor,
      totalMinor,
      protectedReserveMinor: reserveMinor,
      remainingGBPMinor,
      delivery: route.delivery,
      deadline: banking.tuitionDeadline,
      bufferBusinessDays: banking.bufferBusinessDays ?? 1,
      maxBusinessDays: route.maxBusinessDays,
      status: "prepared",
      createdAt: now,
      expiresAt: Math.min(now + 10 * 60 * 1000, route.quoteExpiresAt!),
    });
    await ctx.db.patch(accountId, { paymentStatus: "prepared" });
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "PAYMENT_PREPARED",
      detail: `Proposal ${id}: ${currency} ${(amountMinor / 100).toFixed(2)} to ${banking.recipient}; ${sourceCurrency} ${((sourceMinor + feeMinor) / 100).toFixed(2)} total. Sandbox quote expires in 10 minutes.`,
      actor: "MoveWise",
      timestamp: now,
    });
    return ctx.db.get(id);
  }
  if (!proposal || proposal.expiresAt <= Date.now())
    throw new Error("Quote expired. Reset and prepare a fresh payment");
  if (proposal.targetCurrency !== currency)
    throw new Error("Study currency changed. Prepare a new payment");
  if (account.selectedRoute !== proposal.routeKey)
    throw new Error("Payment route changed. Fresh approval required");
  if (next === "approved") {
    if (proposal.status !== "prepared" || account.paymentStatus !== "prepared")
      throw new Error("Payment is not awaiting approval");
    await ctx.db.patch(proposal._id, {
      status: "approved",
      approvedAt: Date.now(),
      approvedBy: account.userId,
    });
    await ctx.db.patch(accountId, { paymentStatus: "approved" });
  } else {
    if (
      proposal.status !== "approved" ||
      account.paymentStatus !== "approved" ||
      !proposal.approvedBy ||
      proposal.approvedBy !== account.userId
    )
      throw new Error("Explicit owner approval required");
    const wallet = (
      await ctx.db
        .query("wallets")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect()
    ).find((row) => row.currency === proposal.sourceCurrency);
    if (
      !wallet ||
      !Number.isSafeInteger(cents(wallet.amount)) ||
      cents(wallet.amount) < proposal.totalMinor
    )
      throw new Error(
        `Insufficient sandbox ${proposal.sourceCurrency} funds. No money was debited`,
      );
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const remainingGBPMinor = cents(
      wallets.reduce((sum, w) => sum + walletValue(w, currency), 0) -
        (proposal.totalMinor / 100) *
          (walletValue(wallet, currency) / wallet.amount),
    );
    if (!Number.isSafeInteger(remainingGBPMinor))
      throw new Error("Wallet valuations unavailable");
    if (remainingGBPMinor < (proposal.protectedReserveMinor ?? 100000))
      throw new Error("Payment would use your protected living-cost reserve");
    const decision = assessTuition({
      currency,
      amountGBP: proposal.amountMinor / 100,
      reserveGBP: (proposal.protectedReserveMinor ?? 100000) / 100,
      wallets,
      deadline: proposal.deadline,
      bufferBusinessDays: proposal.bufferBusinessDays ?? 1,
      now: Date.now(),
      routes: [
        {
          sourceCurrency: proposal.sourceCurrency,
          targetCurrency: proposal.targetCurrency,
          key: proposal.routeKey,
          provider: proposal.provider,
          fxRate: proposal.fxRate,
          fee: proposal.feeMinor / 100,
          delivery: proposal.delivery,
          maxBusinessDays: proposal.maxBusinessDays,
          quotedAt: proposal.createdAt,
          quoteExpiresAt: proposal.expiresAt,
        },
      ],
    }).routes[0];
    if (!decision.eligible) throw new Error(decision.blockers.join("; "));
    const beforeMinor = cents(wallet.amount),
      afterMinor = beforeMinor - proposal.totalMinor;
    const reference = `SBX-${crypto.randomUUID()}`;
    await ctx.db.patch(wallet._id, {
      amount: afterMinor / 100,
      gbpValue:
        wallet.amount > 0 ? wallet.gbpValue * (afterMinor / beforeMinor) : 0,
    });
    await ctx.db.insert("ledgerEntries", {
      accountId,
      proposalId: proposal._id,
      reference,
      currency: proposal.sourceCurrency,
      debitMinor: proposal.totalMinor,
      beforeMinor,
      afterMinor,
      recipient: proposal.recipient,
      receivedMinor: proposal.amountMinor,
      receivedCurrency: proposal.targetCurrency,
      timestamp: Date.now(),
    });
    await ctx.db.patch(proposal._id, {
      status: "completed",
      reference,
      completedAt: Date.now(),
    });
    await ctx.db.patch(accountId, { paymentStatus: "completed" });
    await ctx.db.insert("notifications", {
      accountId,
      title: "Sandbox payment completed",
      detail: `${reference}: ${proposal.targetCurrency} ${(proposal.amountMinor / 100).toFixed(2)} delivered to ${proposal.recipient}. No real funds moved.`,
      read: false,
      timestamp: Date.now(),
    });
  }
  await ctx.db.insert("auditEvents", {
    accountId,
    type: next === "approved" ? "PAYMENT_APPROVED" : "PAYMENT_EXECUTED",
    detail: `Proposal ${proposal._id}: ${next === "approved" ? "owner approved the exact recipient and quote" : "sandbox debit and receipt committed atomically"}`,
    actor: account.name,
    timestamp: Date.now(),
  });
  return ctx.db.get(proposal._id);
}
