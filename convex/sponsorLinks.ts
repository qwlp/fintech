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
        return {
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
      throw new Error("Enter a valid commitment between £0 and £1 billion");
    await ctx.db.patch(id, { commitment: Math.round(amount * 100) / 100 });
    await ctx.db.insert("notifications", {
      accountId: link.accountId,
      title: "Commitment updated",
      detail: `${account.name} committed £${amount.toLocaleString("en-GB")}.`,
      read: false,
      timestamp: Date.now(),
    });
  },
});
