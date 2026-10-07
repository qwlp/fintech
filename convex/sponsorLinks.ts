import { convertMoney, studyCurrency } from "../shared/currency";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAccount } from "./ownership";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const account = await requireAccount(ctx);
    if (account.role === "Student") {
      const invites = await ctx.db
        .query("sponsorInvites")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();
      const links = await ctx.db
        .query("sponsors")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();
      return {
        invite:
          invites.find((i) => !i.usedAt && i.expiresAt > Date.now()) ?? null,
        links: links
          .filter((l) => l.sponsorAccountId)
          .map((l) => ({ id: l._id, name: l.name })),
      };
    }
    const links = await ctx.db
      .query("sponsors")
      .withIndex("by_sponsor", (q) => q.eq("sponsorAccountId", account._id))
      .collect();
    return {
      invite: null,
      links: await Promise.all(
        links.map(async (l) => ({
          id: l._id,
          name: (await ctx.db.get(l.accountId))?.name ?? "Student",
        })),
      ),
    };
  },
});

export const createInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const account = await requireAccount(ctx);
    if (account.role !== "Student")
      throw new Error("Only students can invite sponsors");
    const invites = await ctx.db
      .query("sponsorInvites")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    for (const invite of invites)
      if (!invite.usedAt) await ctx.db.delete(invite._id);
    // UUID randomness gives a 48-bit code; invites expire and can be redeemed once.
    let code: string;
    do {
      code = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
    } while (
      await ctx.db
        .query("sponsorInvites")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first()
    );
    await ctx.db.insert("sponsorInvites", {
      accountId: account._id,
      code,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  },
});

export const connect = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx);
    if (account.role !== "Sponsor")
      throw new Error("Use a sponsor account to accept an invitation");
    const code = args.code.replace(/[\s-]/g, "").toUpperCase();
    const invite = await ctx.db
      .query("sponsorInvites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!invite || invite.usedAt || invite.expiresAt <= Date.now())
      throw new Error(
        "This code is invalid, expired, or already used. Ask the student for a new code.",
      );
    const links = await ctx.db
      .query("sponsors")
      .withIndex("by_sponsor", (q) => q.eq("sponsorAccountId", account._id))
      .collect();
    if (links.some((l) => l.accountId === invite.accountId))
      throw new Error("You are already connected to this student");
    await ctx.db.insert("sponsors", {
      accountId: invite.accountId,
      sponsorAccountId: account._id,
      key: String(account._id),
      name: account.name,
      relationship: "Sponsor",
      commitment: 0,
      nextDate: "Not scheduled",
      permissions: [],
    });
    await ctx.db.patch(invite._id, { usedAt: Date.now() });
    await ctx.db.insert("notifications", {
      accountId: invite.accountId,
      title: "Sponsor connected",
      detail: `${account.name} accepted your invitation. Manage their access in Sponsors.`,
      read: false,
      timestamp: Date.now(),
    });
  },
});

export const disconnect = mutation({
  args: { id: v.id("sponsors") },
  handler: async (ctx, { id }) => {
    const account = await requireAccount(ctx);
    const link = await ctx.db.get(id);
    if (
      !link ||
      (link.accountId !== account._id && link.sponsorAccountId !== account._id)
    )
      throw new Error("Connection access denied");
    await ctx.db.delete(id);
  },
});

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const account = await requireAccount(ctx);
    if (account.role !== "Sponsor") throw new Error("Sponsor account required");
    const links = await ctx.db
      .query("sponsors")
      .withIndex("by_sponsor", (q) => q.eq("sponsorAccountId", account._id))
      .collect();
    return Promise.all(
      links.map(async (link) => {
        const student = await ctx.db.get(link.accountId);
        const currency = studyCurrency(student?.countryTo ?? "");
        const requests = link.permissions.includes("Funding requests")
          ? (
              await ctx.db
                .query("sponsorRequests")
                .withIndex("by_account", (q) =>
                  q.eq("accountId", link.accountId),
                )
                .collect()
            )
              .filter((request) => request.sponsorKey === link.key)
              .sort((a, b) => b.createdAt - a.createdAt)
              .map(({ _id, amount, purpose, neededBy, status }) => ({
                id: _id,
                amount,
                purpose,
                neededBy,
                status,
              }))
          : [];
        const configs = link.permissions.includes("Sponsored tuition")
          ? await ctx.db
              .query("appConfig")
              .withIndex("by_account", (q) => q.eq("accountId", link.accountId))
              .collect()
          : [];
        const banking = configs.find((row) => row.key === "banking")?.value;
        const ledger = link.permissions.includes("Sponsored tuition")
          ? await ctx.db
              .query("ledgerEntries")
              .withIndex("by_account", (q) => q.eq("accountId", link.accountId))
              .collect()
          : [];
        const tuition =
          banking && Number.isFinite(banking.paymentAmount)
            ? {
                amountGBP: banking.paymentAmount,
                deadline: banking.tuitionDeadline ?? null,
                status: student?.paymentStatus ?? "not_started",
                paidGBP: ledger.reduce(
                  (sum, row) =>
                    sum +
                    convertMoney(
                      row.receivedMinor / 100,
                      row.receivedCurrency,
                      currency,
                    ),
                  0,
                ),
                recentPayments: ledger
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 5)
                  .map((row) => ({
                    amountGBP: row.receivedMinor / 100,
                    currency: row.receivedCurrency,
                    timestamp: row.timestamp,
                  })),
              }
            : null;
        const requestSummary = link.permissions.includes("Funding requests")
          ? {
              requestedGBP: requests
                .filter((r) => r.status === "sent")
                .reduce((sum, r) => sum + r.amount, 0),
              receivedGBP: requests
                .filter((r) => r.status === "fulfilled")
                .reduce((sum, r) => sum + r.amount, 0),
            }
          : null;
        const costs = link.permissions.includes("Financial overview")
          ? await ctx.db
              .query("costs")
              .withIndex("by_account", (q) => q.eq("accountId", link.accountId))
              .collect()
          : [];
        const financialOverview = link.permissions.includes(
          "Financial overview",
        )
          ? {
              plannedGBP: costs.reduce((sum, cost) => sum + cost.amount, 0),
              paidGBP: costs
                .filter((cost) => cost.paid)
                .reduce((sum, cost) => sum + cost.amount, 0),
              categories: [...new Set(costs.map((cost) => cost.category))].map(
                (category) => ({
                  category,
                  plannedGBP: costs
                    .filter((cost) => cost.category === category)
                    .reduce((sum, cost) => sum + cost.amount, 0),
                  paidGBP: costs
                    .filter((cost) => cost.category === category && cost.paid)
                    .reduce((sum, cost) => sum + cost.amount, 0),
                }),
              ),
            }
          : null;
        return {
          currency,
          financialOverview,
          tuition,
          requestSummary,
          id: link._id,
          name: student?.name ?? "Student",
          commitment: link.commitment,
          permissions: link.permissions,
          requests,
        };
      }),
    );
  },
});

export const updateCommitment = mutation({
  args: { id: v.id("sponsors"), amount: v.number() },
  handler: async (ctx, { id, amount }) => {
    const account = await requireAccount(ctx);
    const link = await ctx.db.get(id);
    if (
      account.role !== "Sponsor" ||
      !link ||
      link.sponsorAccountId !== account._id
    )
      throw new Error("Connection access denied");
    if (!Number.isFinite(amount) || amount < 0 || amount > 1e9)
      throw new Error(
        "Enter a valid commitment between 0 and 1 billion in the student’s study currency",
      );
    const student = await ctx.db.get(link.accountId);
    await ctx.db.patch(id, { commitment: Math.round(amount * 100) / 100 });
    await ctx.db.insert("notifications", {
      accountId: link.accountId,
      title: "Commitment updated",
      detail: `${account.name} committed ${studyCurrency(student?.countryTo ?? "")} ${amount.toLocaleString("en-GB")}.`,
      read: false,
      timestamp: Date.now(),
    });
  },
});
