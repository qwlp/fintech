import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAccount } from "./ownership";
import { assessTuition } from "./tuitionDecision";

export const cents = (value: number) => Math.round(value * 100);
export async function paymentTransition(
  ctx: MutationCtx,
  accountId: Id<"accounts">,
  next: "prepared" | "approved" | "completed",
  expectedProposalId?: Id<"paymentProposals">,
) {
  const account = await requireAccount(ctx, accountId);
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
    const limit = security?.paymentLimit ?? 2500;
    if (!Number.isFinite(limit) || amount > limit)
      throw new Error("Payment exceeds the sandbox transaction limit");
    const amountMinor = cents(amount);
    if (amountMinor <= 0) throw new Error("Payment must be at least £0.01");
    const sourceMinor = Math.ceil(amountMinor / route.fxRate);
    const feeMinor = cents(route.fee);
    if (
      ![amountMinor, sourceMinor, feeMinor, sourceMinor + feeMinor].every(
        Number.isSafeInteger,
      )
    )
      throw new Error("Quote exceeds supported precision");
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const reserveMinor = cents(security?.protectedReserveGBP ?? 1000);
    if (!Number.isSafeInteger(reserveMinor) || reserveMinor < 0)
      throw new Error("Invalid protected reserve");
    const wallet = wallets.find((w) => w.currency === "USD");
    if (!wallet || cents(wallet.amount) < sourceMinor + feeMinor)
      throw new Error("Insufficient sandbox USD funds");
    const remainingGBPMinor = cents(
      wallets.reduce((sum, w) => sum + w.gbpValue, 0) -
        ((sourceMinor + feeMinor) / 100) * (wallet.gbpValue / wallet.amount),
    );
    if (!Number.isSafeInteger(remainingGBPMinor))
      throw new Error("Wallet valuations unavailable");
    if (remainingGBPMinor < reserveMinor)
      throw new Error("Payment would use your protected living-cost reserve");
    const now = Date.now();
    const decision = assessTuition({
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
      provider: route.provider,
      fxRate: route.fxRate,
      sourceCurrency: "USD",
      targetCurrency: "GBP",
      amountMinor,
      sourceMinor,
      feeMinor,
      totalMinor: sourceMinor + feeMinor,
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
      detail: `Proposal ${id}: GBP ${(amountMinor / 100).toFixed(2)} to ${banking.recipient}; USD ${((sourceMinor + feeMinor) / 100).toFixed(2)} total. Sandbox quote expires in 10 minutes.`,
      actor: "MoveWise",
      timestamp: now,
    });
    return ctx.db.get(id);
  }
  if (!proposal || proposal.expiresAt <= Date.now())
    throw new Error("Quote expired. Reset and prepare a fresh payment");
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
      throw new Error("Insufficient sandbox USD funds. No money was debited");
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const remainingGBPMinor = cents(
      wallets.reduce((sum, w) => sum + w.gbpValue, 0) -
        (proposal.totalMinor / 100) * (wallet.gbpValue / wallet.amount),
    );
    if (!Number.isSafeInteger(remainingGBPMinor))
      throw new Error("Wallet valuations unavailable");
    if (remainingGBPMinor < (proposal.protectedReserveMinor ?? 100000))
      throw new Error("Payment would use your protected living-cost reserve");
    const decision = assessTuition({
      amountGBP: proposal.amountMinor / 100,
      reserveGBP: (proposal.protectedReserveMinor ?? 100000) / 100,
      wallets,
      deadline: proposal.deadline,
      bufferBusinessDays: proposal.bufferBusinessDays ?? 1,
      now: Date.now(),
      routes: [
        {
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
      detail: `${reference}: £${(proposal.amountMinor / 100).toFixed(2)} delivered to ${proposal.recipient}. No real funds moved.`,
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
