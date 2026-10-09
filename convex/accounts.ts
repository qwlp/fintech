import { validateMoveSettings } from "../shared/move-planner";
import { routeProviderName } from "../shared/payment-routes";
import {
  mutationGeneric as mutation,
  actionGeneric as action,
  internalMutationGeneric as internalMutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";
import { syncWorkspaceCurrency } from "./workspaceCurrency";
import {
  convertMoney,
  currencyRate,
  studyCurrency,
  walletValue,
  sandboxRouteGBPPerUSD,
} from "../shared/currency";
import { getCountry, validateStudySelection } from "../shared/study";

import { requireAccount } from "./ownership";
import { internal } from "./_generated/api";
import { internalQuery } from "./_generated/server";
import { requestReply } from "./openrouter";
import { paymentTransition } from "./paymentEngine";
import {
  assessTuition,
  hasPreparationIntent,
  parseDeadline,
} from "./tuitionDecision";

const DEMO_EMAIL = "dara@financialpassport.demo";

export const bootstrap = query({
  args: {},
  handler: async (ctx) => {
    const account = await requireAccount(ctx);
    const accountId = account._id;
    const [
      costs,
      funding,
      sponsors,
      wallets,
      paymentRoutes,
      auditEvents,
      messages,
      notifications,
      checklist,
      configRows,
      sponsorRequests,
      rateAlerts,
    ] = await Promise.all([
      ctx.db
        .query("costs")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("funding")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("sponsors")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("wallets")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("paymentRoutes")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("auditEvents")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .order("desc")
        .collect(),
      ctx.db
        .query("messages")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .order("asc")
        .collect(),
      ctx.db
        .query("notifications")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .order("desc")
        .collect(),
      ctx.db
        .query("checklist")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("appConfig")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("sponsorRequests")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .order("desc")
        .collect(),
      ctx.db
        .query("rateAlerts")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .order("desc")
        .collect(),
    ]);
    return {
      account,
      costs,
      funding,
      sponsors,
      wallets,
      paymentRoutes: paymentRoutes.map((route) => ({
        ...route,
        provider: routeProviderName(route.provider),
      })),
      auditEvents,
      messages,
      notifications,
      checklist: checklist.sort((a, b) => a.position - b.position),
      config: Object.fromEntries(configRows.map((row) => [row.key, row.value])),
      sponsorRequests,
      rateAlerts,
      paymentProposals: await ctx.db
        .query("paymentProposals")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .order("desc")
        .collect(),
      toolExecutions: await ctx.db
        .query("toolExecutions")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .order("desc")
        .take(50),
      ledgerEntries: await ctx.db
        .query("ledgerEntries")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
    };
  },
});

export const seedDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_email", (q) => q.eq("email", DEMO_EMAIL))
      .unique();
    if (existing) return existing._id;
    const accountId = await ctx.db.insert("accounts", {
      email: DEMO_EMAIL,
      name: "Dara Chan",
      initials: "DC",
      role: "Student",
      planName: "UK Study Plan",
      countryFrom: "Cambodia",
      countryTo: "United Kingdom",
      university: "Example UK University",
      course: "MSc Financial Technology",
      paymentStatus: "not_started",
      selectedRoute: "wise",
      sponsorRequestSent: false,
    });
    const costs = [
      ["tuition", "Tuition", "Recurring", 6000, "3 instalments", false],
      ["rent", "Rent", "Recurring", 7800, "Monthly", false],
      ["living", "Living costs", "Recurring", 5100, "Monthly", false],
      ["deposit", "Housing deposit", "Arrival", 1300, "01 Sep 2026", false],
      ["visa", "Visa & health surcharge", "Pre-departure", 1600, "Paid", true],
      [
        "flight",
        "Flight & arrival",
        "Pre-departure",
        800,
        "20 Aug 2026",
        false,
      ],
      ["emergency", "Emergency buffer", "Safety", 2000, "Reserve", false],
    ] as const;
    for (const [key, name, category, amount, due, paid] of costs)
      await ctx.db.insert("costs", {
        accountId,
        key,
        name,
        category,
        amount,
        due,
        paid,
      });
    const funding = [
      ["savings", "Personal savings", "Savings", 8900, "Available now"],
      ["parent", "Parent sponsorship", "Sponsor", 9000, "Quarterly"],
      ["scholarship", "Merit scholarship", "Scholarship", 4000, "01 Sep 2026"],
    ] as const;
    for (const [key, name, type, amount, available] of funding)
      await ctx.db.insert("funding", {
        accountId,
        key,
        name,
        type,
        amount,
        status: "confirmed",
        available,
      });
    await ctx.db.insert("sponsors", {
      accountId,
      key: "sp1",
      name: "Sokha Chan",
      relationship: "Parent",
      commitment: 9000,
      nextDate: "15 Nov 2026",
      permissions: [
        "Commitment status",
        "Sponsored tuition",
        "Funding requests",
      ],
    });
    for (const wallet of [
      {
        currency: "USD",
        symbol: "$",
        amount: 8700,
        gbpValue: 6734,
        label: "Primary savings",
      },
      {
        currency: "GBP",
        symbol: "£",
        amount: 2166,
        gbpValue: 2166,
        label: "UK current account",
      },
      {
        currency: "KHR",
        symbol: "៛",
        amount: 1200000,
        gbpValue: 229,
        label: "Home account",
      },
    ])
      await ctx.db.insert("wallets", { accountId, ...wallet });
    for (const route of [
      {
        key: "wise",
        provider: "Wise",
        sourceAmount: 2574.6,
        fee: 8.4,
        fxRate: 0.774,
        delivery: "1 business day",
        recommended: true,
      },
      {
        key: "swift",
        provider: "SWIFT bank transfer",
        sourceAmount: 2607,
        fee: 34,
        fxRate: 0.768,
        delivery: "3–5 business days",
      },
      {
        key: "card",
        provider: "Debit / credit card",
        sourceAmount: 2598,
        fee: 26,
        fxRate: 0.77,
        delivery: "Instant",
      },
    ])
      await ctx.db.insert("paymentRoutes", { accountId, ...route });
    const now = Date.now();
    for (const [type, detail, actor, offset] of [
      ["PLAN_CREATED", "UK study plan created", "Dara Chan", 3000],
      ["SPONSOR_ACCEPTED", "£9,000 commitment confirmed", "Sokha Chan", 2000],
      [
        "RECIPIENT_VERIFIED",
        "University account matched verified directory",
        "MoveWise",
        1000,
      ],
    ] as const)
      await ctx.db.insert("auditEvents", {
        accountId,
        type,
        detail,
        actor,
        timestamp: now - offset,
      });
    await ctx.db.insert("messages", {
      accountId,
      from: "agent",
      text: "Good morning, Dara. I can explain your plan, simulate changes, or help prepare your upcoming tuition payment.",
      timestamp: now,
    });
    await ctx.db.insert("notifications", {
      accountId,
      title: "Tuition due soon",
      detail: "Your £2,000 tuition instalment is due in 12 days.",
      read: false,
      timestamp: now,
    });
    await ctx.db.insert("notifications", {
      accountId,
      title: "Sponsor contribution confirmed",
      detail: "Sokha confirmed £1,000 for 15 November.",
      read: false,
      timestamp: now - 1000,
    });
    for (const [key, label, detail, done, position] of [
      ["visa", "Visa fee paid", "Receipt verified", true, 0],
      ["housing", "Housing deposit reserved", "£1,300 set aside", true, 1],
      ["tuition", "Tuition instalment prepared", "Due in 12 days", false, 2],
      ["emergency", "Emergency fund completed", "£2,700 gap remains", false, 3],
    ] as const)
      await ctx.db.insert("checklist", {
        accountId,
        key,
        label,
        detail,
        done,
        position,
      });
    const config = {
      profile: {
        courseStart: "21 September 2026",
        financialStatus: "Partially funded",
        sponsorSupport: "£1,000 / month",
        confirmedFunding: "£21,900 confirmed",
      },
      move: {
        arrivalDate: "14 Sep 2026",
        readyBy: "07 Sep 2026",
        apartment: "Riverside House, Zone 2",
        apartmentNote:
          "Balanced for university access, groceries, and city connections.",
        requirements: [
          ["Visa & health surcharge", "Paid", "£1,600"],
          ["Flight", "Compare", "£480–610"],
          ["First month rent + deposit", "Reserved", "£1,950"],
          ["Electricity & water", "Estimated", "£145 / mo"],
          ["Daily expenses", "Budgeted", "£425 / mo"],
          ["Tuition fee", "Due 12 Oct", "£6,000 / yr"],
        ],
        routes: [
          [
            "Direct flight",
            "Phnom Penh → London · 1 stop",
            "16h 40m",
            "£610",
            "Easiest",
            true,
          ],
          [
            "Budget flight",
            "Phnom Penh → Bangkok → London · 2 stops",
            "22h 10m",
            "£480",
            "More effort",
            false,
          ],
          [
            "Flexible flight",
            "Phnom Penh → Singapore → London · 1 stop",
            "18h 25m",
            "£545",
            "Good balance",
            false,
          ],
        ],
        transport: [
          ["Train", "12 min · every 10 min", "£3.20"],
          ["Bus", "24 min · every 8 min", "£1.75"],
          ["Uber / taxi", "15–30 min with traffic", "£12–18"],
        ],
        oneTime: 3700,
        monthly: 1220,
        tuition: 6000,
      },
      banking: {
        bankName: "Student Current Account",
        reason:
          "No monthly fee, local GBP details, fee-free domestic payments, and a nearby branch.",
        swift: "EXUKGB2L",
        recipient: "Example UK University",
        sendBy: "05 Oct 2026",
        paymentAmount: 2000,
        recipientAccountLast4: "1842",
        sourceAccountLast4: "8700",
        transactionReference: "TX-DEMO-842913",
      },
      sponsorship: {
        inviteCode: "FP-7K2M",
        transferred: 6000,
        categories: [
          ["Tuition", 6000],
          ["Accommodation", 2000],
          ["Expenses", 1000],
        ],
        expectedArrival: "16–18 Nov 2026",
        schedule: [
          ["15 Nov 2026", "Living expenses", 1000],
          ["15 Jan 2027", "Tuition instalment", 2000],
        ],
      },
      security: {
        approvalRequired: true,
        paymentLimit: 2500,
        approvalExpiryMinutes: 10,
      },
      departure: {
        documents: [
          ["Visa payment receipt", "Verified", "PDF · 182 KB"],
          ["University tuition invoice", "Ready", "PDF · 244 KB"],
          ["Sponsor commitment letter", "Signed", "PDF · 96 KB"],
          ["Housing agreement", "Missing", "Upload required"],
        ],
        deadlines: [
          [
            "12 Oct",
            "Tuition instalment",
            "£2,000 · 12 days remaining",
            "Next",
          ],
          ["15 Nov", "Sponsor contribution", "£1,000 · Confirmed", ""],
          ["05 Jan", "Second tuition instalment", "£2,000 · Planned", ""],
        ],
      },
    };
    for (const [key, value] of Object.entries(config))
      await ctx.db.insert("appConfig", { accountId, key, value });
    return accountId;
  },
});

export const setRoute = mutation({
  args: { accountId: v.id("accounts"), route: v.string() },
  handler: async (ctx, args) => {
    await requireAccount(ctx, args.accountId);
    const account = await ctx.db.get(args.accountId);
    if (account?.paymentStatus !== "not_started")
      throw new Error(
        "Reset payment before changing provider; fresh approval is required",
      );
    const routes = await ctx.db
      .query("paymentRoutes")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();
    if (!routes.some((route) => route.key === args.route))
      throw new Error("Unknown payment route");
    return ctx.db.patch(args.accountId, { selectedRoute: args.route });
  },
});
export const toggleChecklist = mutation({
  args: { accountId: v.id("accounts"), key: v.string() },
  handler: async (ctx, args) => {
    await requireAccount(ctx, args.accountId);
    const item = (
      await ctx.db
        .query("checklist")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
        .collect()
    ).find((x) => x.key === args.key);
    if (item) await ctx.db.patch(item._id, { done: !item.done });
  },
});
export const markNotificationsRead = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    await requireAccount(ctx, args.accountId);
    for (const item of await ctx.db
      .query("notifications")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect())
      if (!item.read) await ctx.db.patch(item._id, { read: true });
  },
});
export const requestSponsor = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx, args.accountId);
    await ctx.db.patch(args.accountId, { sponsorRequestSent: true });
    await ctx.db.insert("auditEvents", {
      accountId: args.accountId,
      type: "SPONSOR_REQUESTED",
      detail: `Contribution request sent for ${studyCurrency(account.countryTo)} ${convertMoney(1000, "GBP", studyCurrency(account.countryTo))}`,
      actor: account.name,
      timestamp: Date.now(),
    });
  },
});

export const completeSetup = mutation({
  args: {
    name: v.string(),
    countryFrom: v.string(),
    countryTo: v.string(),
    university: v.string(),
    course: v.string(),
    courseStart: v.string(),
    fundingAmount: v.number(),
    sponsorSupport: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx);
    validateStudySelection(
      args.countryFrom,
      args.countryTo,
      args.university,
      account.role === "Student",
    );
    const name = args.name.trim();
    if (!name || name.length > 100) throw new Error("Enter your name");
    if (!args.countryFrom.trim()) throw new Error("Enter your home country");
    if (account.role === "Student" && !args.countryTo.trim())
      throw new Error("Enter your study country");
    if (!Number.isFinite(args.fundingAmount) || args.fundingAmount < 0)
      throw new Error("Enter a valid funding amount");
    if (args.courseStart && !/^\d{4}-\d{2}(?:-\d{2})?$/.test(args.courseStart))
      throw new Error("Choose a start date");
    await syncWorkspaceCurrency(ctx, account, args.countryTo);
    const rows = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    const row = rows.find((item) => item.key === "profile");
    const value = {
      ...(row?.value ?? {}),
      homeCurrency: getCountry(args.countryFrom)?.currency,
      studyCurrency: getCountry(args.countryTo)?.currency ?? "",
      fundingCurrency: studyCurrency(args.countryTo),
      workspaceCurrency: studyCurrency(args.countryTo),
      courseStart: args.courseStart,
      fundingAmount: args.fundingAmount,
      sponsorSupport: args.sponsorSupport,
    };
    await ctx.db.patch(account._id, {
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join(""),
      countryFrom: getCountry(args.countryFrom)!.name,
      countryTo: getCountry(args.countryTo)?.name ?? "",
      university: args.university.trim(),
      course: args.course.trim(),
      setupComplete: true,
    });
    if (row) await ctx.db.patch(row._id, { value });
    else
      await ctx.db.insert("appConfig", {
        accountId: account._id,
        key: "profile",
        value,
      });
  },
});

export const updateProfile = mutation({
  args: {
    accountId: v.id("accounts"),
    name: v.string(),
    countryFrom: v.string(),
    countryTo: v.string(),
    university: v.string(),
    course: v.string(),
    courseStart: v.string(),
    financialStatus: v.string(),
    sponsorSupport: v.string(),
    fundingAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const owner = await requireAccount(ctx, args.accountId);
    validateStudySelection(
      args.countryFrom,
      args.countryTo,
      args.university,
      owner.role === "Student",
    );
    const {
      accountId,
      courseStart,
      financialStatus,
      sponsorSupport,
      fundingAmount,
      ...account
    } = args;
    if (!Number.isFinite(fundingAmount) || fundingAmount < 0)
      throw new Error("Invalid confirmed funding amount");
    account.countryFrom = getCountry(account.countryFrom)!.name;
    account.countryTo = getCountry(account.countryTo)?.name ?? "";
    account.university = account.university.trim();
    const initials = account.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
    await syncWorkspaceCurrency(ctx, owner, account.countryTo);
    await ctx.db.patch(accountId, { ...account, initials });
    const row = (
      await ctx.db
        .query("appConfig")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect()
    ).find((item) => item.key === "profile");
    const value = {
      ...(row?.value ?? {}),
      courseStart,
      financialStatus,
      sponsorSupport,
      fundingAmount,
      homeCurrency: getCountry(account.countryFrom)?.currency,
      studyCurrency: getCountry(account.countryTo)?.currency ?? "",
      fundingCurrency: studyCurrency(account.countryTo),
      workspaceCurrency: studyCurrency(account.countryTo),
    };
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("appConfig", { accountId, key: "profile", value });
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "PROFILE_UPDATED",
      detail: "Student profile updated",
      actor: account.name,
      timestamp: Date.now(),
    });
  },
});

export const createSponsorRequest = mutation({
  args: {
    accountId: v.id("accounts"),
    sponsorKey: v.string(),
    amount: v.number(),
    purpose: v.string(),
    neededBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAccount(ctx, args.accountId);
    if (!Number.isFinite(args.amount) || args.amount <= 0)
      throw new Error("Amount must be positive");
    const sponsor = (
      await ctx.db
        .query("sponsors")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
        .collect()
    ).find((s) => s.key === args.sponsorKey);
    if (!sponsor) throw new Error("Sponsor not found");
    if (
      args.amount > 1e6 ||
      !args.purpose.trim() ||
      args.purpose.length > 500 ||
      args.neededBy.length > 100
    )
      throw new Error("Invalid funding request");
    await ctx.db.insert("sponsorRequests", {
      ...args,
      status: "sent",
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.accountId, { sponsorRequestSent: true });
    await ctx.db.insert("auditEvents", {
      accountId: args.accountId,
      type: "SPONSOR_REQUESTED",
      detail: `${args.purpose} contribution requested for ${studyCurrency((await ctx.db.get(args.accountId))?.countryTo ?? "")} ${args.amount.toLocaleString("en-GB")}`,
      actor: "Student",
      timestamp: Date.now(),
    });
  },
});

export const setSponsorPermission = mutation({
  args: {
    accountId: v.id("accounts"),
    sponsorKey: v.string(),
    permission: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAccount(ctx, args.accountId);
    const sponsor = (
      await ctx.db
        .query("sponsors")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
        .collect()
    ).find((item) => item.key === args.sponsorKey);
    if (!sponsor) throw new Error("Sponsor not found");
    if (
      ![
        "Commitment status",
        "Sponsored tuition",
        "Funding requests",
        "Financial overview",
      ].includes(args.permission)
    )
      throw new Error("Unknown sponsor permission");
    const permissions = args.enabled
      ? Array.from(new Set([...sponsor.permissions, args.permission]))
      : sponsor.permissions.filter(
          (permission: string) => permission !== args.permission,
        );
    await ctx.db.patch(sponsor._id, { permissions });
    await ctx.db.insert("auditEvents", {
      accountId: args.accountId,
      type: "SPONSOR_PERMISSION",
      detail: `${args.permission}: ${args.enabled ? "granted" : "revoked"}`,
      actor: "Student",
      timestamp: Date.now(),
    });
  },
});

export const createRateAlert = mutation({
  args: {
    accountId: v.id("accounts"),
    pair: v.string(),
    targetRate: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAccount(ctx, args.accountId);
    if (!Number.isFinite(args.targetRate) || args.targetRate <= 0)
      throw new Error("Target rate must be positive");
    for (const alert of await ctx.db
      .query("rateAlerts")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect())
      if (alert.pair === args.pair && alert.active)
        await ctx.db.patch(alert._id, { active: false });
    await ctx.db.insert("rateAlerts", {
      ...args,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const ensureConfig = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const owner = await requireAccount(ctx, accountId);
    if (owner.userId || owner.email !== DEMO_EMAIL) {
      await syncWorkspaceCurrency(ctx, owner);
      return;
    }
    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const rows = {
      profile: {
        courseStart: "21 September 2026",
        financialStatus: "Partially funded",
        sponsorSupport: "£1,000 / month",
        confirmedFunding: "£21,900 confirmed",
      },
      move: {
        arrivalDate: "14 Sep 2026",
        readyBy: "07 Sep 2026",
        apartment: "Riverside House, Zone 2",
        apartmentNote:
          "Balanced for university access, groceries, and city connections.",
        requirements: [
          ["Visa & health surcharge", "Paid", "£1,600"],
          ["Flight", "Compare", "£480–610"],
          ["First month rent + deposit", "Reserved", "£1,950"],
          ["Electricity & water", "Estimated", "£145 / mo"],
          ["Daily expenses", "Budgeted", "£425 / mo"],
          ["Tuition fee", "Due 12 Oct", "£6,000 / yr"],
        ],
        routes: [
          [
            "Direct flight",
            "Phnom Penh → London · 1 stop",
            "16h 40m",
            "£610",
            "Easiest",
            true,
          ],
          [
            "Budget flight",
            "Phnom Penh → Bangkok → London · 2 stops",
            "22h 10m",
            "£480",
            "More effort",
            false,
          ],
        ],
        transport: [
          ["Train", "12 min · every 10 min", "£3.20"],
          ["Bus", "24 min · every 8 min", "£1.75"],
          ["Uber / taxi", "15–30 min with traffic", "£12–18"],
        ],
        oneTime: 3700,
        monthly: 1220,
        tuition: 6000,
      },
      banking: {
        bankName: "Student Current Account",
        reason:
          "No monthly fee, local GBP details,fee-free domestic payments, and a nearby branch.",
        swift: "EXUKGB2L",
        recipient: "Example UK University",
        sendBy: "05 Oct 2026",
        paymentAmount: 2000,
        recipientAccountLast4: "1842",
        sourceAccountLast4: "8700",
        transactionReference: "TX-DEMO-842913",
      },
      sponsorship: {
        inviteCode: "FP-7K2M",
        transferred: 6000,
        categories: [
          ["Tuition", 6000],
          ["Accommodation", 2000],
          ["Expenses", 1000],
        ],
        expectedArrival: "16–18 Nov 2026",
      },
      security: {
        approvalRequired: true,
        paymentLimit: 2500,
        approvalExpiryMinutes: 10,
      },
      departure: {
        documents: [
          ["Visa payment receipt", "Verified", "PDF · 182 KB"],
          ["University tuition invoice", "Ready", "PDF · 244 KB"],
          ["Sponsor commitment letter", "Signed", "PDF · 96 KB"],
          ["Housing agreement", "Missing", "Upload required"],
        ],
        deadlines: [
          [
            "12 Oct",
            "Tuition instalment",
            "£2,000 · 12 days remaining",
            "Next",
          ],
          ["15 Nov", "Sponsor contribution", "£1,000 · Confirmed", ""],
          ["05 Jan", "Second tuition instalment", "£2,000 · Planned", ""],
        ],
      },
    };
    for (const [key, defaults] of Object.entries(rows)) {
      const row = existing.find((item) => item.key === key);
      if (!row) {
        await ctx.db.insert("appConfig", { accountId, key, value: defaults });
      } else {
        // Older demo accounts may contain a config section with missing fields.
        const value = { ...defaults, ...row.value };
        if (
          Object.keys(defaults).some(
            (field) => row.value?.[field] === undefined,
          )
        )
          await ctx.db.patch(row._id, { value });
      }
    }
    await syncWorkspaceCurrency(ctx, owner);
  },
});

export const transitionPayment = mutation({
  args: {
    accountId: v.id("accounts"),
    next: v.union(
      v.literal("prepared"),
      v.literal("approved"),
      v.literal("completed"),
    ),
    proposalId: v.optional(v.id("paymentProposals")),
    expectedQuote: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, next, proposalId, expectedQuote }) =>
    paymentTransition(ctx, accountId, next, proposalId, expectedQuote),
});

export const verifySandboxRecipient = mutation({
  args: { accountId: v.id("accounts"), last4: v.string() },
  handler: async (ctx, { accountId, last4 }) => {
    const account = await requireAccount(ctx, accountId);
    if (account.role !== "Student" || account.paymentStatus !== "not_started")
      throw new Error("Reset payment before verifying recipient");
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const row = config.find((r) => r.key === "banking");
    if (!row || last4 !== row.value.recipientAccountLast4)
      throw new Error("Recipient account digits do not match");
    await ctx.db.patch(row._id, {
      value: { ...row.value, recipientVerified: true },
    });
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "RECIPIENT_VERIFIED",
      detail:
        "Owner checked the sandbox recipient account suffix; this is not real bank verification",
      actor: account.name,
      timestamp: Date.now(),
    });
  },
});

export const chatContext = internalQuery({
  args: { accountId: v.id("accounts"), chatId: v.optional(v.string()) },
  handler: async (ctx, { accountId, chatId }) => {
    const account = await requireAccount(ctx, accountId);
    const [costRows, fundingRows, configRows] = await Promise.all([
      ctx.db
        .query("costs")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("funding")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("appConfig")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
    ]);
    const totalCost = costRows.reduce((sum, item) => sum + item.amount, 0);
    const profileFunding = configRows.find((row) => row.key === "profile")
      ?.value?.fundingAmount;
    const totalFunding =
      typeof profileFunding === "number" &&
      Number.isFinite(profileFunding) &&
      profileFunding >= 0
        ? profileFunding
        : fundingRows
            .filter((item) => item.status === "confirmed")
            .reduce((sum, item) => sum + item.amount, 0);
    const gap = Math.max(0, totalCost - totalFunding);
    const coverage = totalCost
      ? Math.min(100, (totalFunding / totalCost) * 100)
      : 0;
    const banking = (configRows.find((row) => row.key === "banking")?.value ??
      {}) as Record<string, any>;
    const history = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) =>
        q.eq("accountId", accountId).eq("chatId", chatId),
      )
      .order("desc")
      .take(20);
    const profile = configRows.find((row) => row.key === "profile")?.value;
    return {
      profile: {
        name: account.name ?? "",
        role: account.role ?? "",
        homeCountry: account.countryFrom ?? "",
        studyCountry: account.countryTo ?? "",
        university: account.university ?? "",
        course: account.course ?? "",
        courseStart:
          typeof profile?.courseStart === "string" ? profile.courseStart : "",
        financialStatus:
          typeof profile?.financialStatus === "string"
            ? profile.financialStatus
            : "",
        sponsorSupport:
          typeof profile?.sponsorSupport === "string"
            ? profile.sponsorSupport
            : "",
        confirmedFunding: totalFunding,
        fundingCurrency: studyCurrency(account.countryTo),
      },
      currency: studyCurrency(account.countryTo),
      totalCost,
      totalFunding,
      gap,
      coverage,
      paymentAmount: Number(banking.paymentAmount ?? 0),
      bestProvider: null, // A recommendation requires fresh, deadline-aware tool evidence.
      selectedRoute: account.selectedRoute || null,
      recipientConfirmed: banking.recipientVerified === true,
      history: history.reverse().map((message) => ({
        role: message.from === "user" ? "user" : "assistant",
        content: message.text.slice(0, 4000),
      })),
    };
  },
});

export const saveChatExchange = internalMutation({
  args: {
    accountId: v.id("accounts"),
    chatId: v.optional(v.string()),
    text: v.string(),
    reply: v.string(),
    toolResults: v.optional(
      v.array(v.object({ name: v.string(), result: v.any() })),
    ),
  },
  handler: async (ctx, { accountId, chatId, text, reply, toolResults }) => {
    const account = await requireAccount(ctx, accountId);
    if (!account.aiConsentAt)
      throw new Error("AI processing consent has been revoked");
    const timestamp = Date.now();
    await ctx.db.insert("messages", {
      accountId,
      ...(chatId ? { chatId } : {}),
      from: "user",
      text,
      timestamp,
    });
    await ctx.db.insert("messages", {
      accountId,
      ...(chatId ? { chatId } : {}),
      from: "agent",
      text: reply,
      ...(toolResults?.length ? { toolResults } : {}),
      timestamp: timestamp + 1,
    });
  },
});

export const sendMessage = action({
  args: {
    accountId: v.id("accounts"),
    chatId: v.optional(v.string()),
    text: v.string(),
  },
  handler: async (ctx, { accountId, chatId, text }): Promise<void> => {
    const value = text.trim();
    if (!value || value.length > 4000)
      throw new Error("Message must contain 1–4000 characters");
    const context = await ctx.runQuery(internal.accounts.chatContext, {
      accountId,
      chatId,
    });
    await ctx.runMutation(internal.accounts.reserveAIRequest, { accountId });
    const toolResults: { name: string; result: unknown }[] = [];
    let reply: string;
    try {
      reply = await requestReply(context, value, async (name, args) => {
        // Tools have no model-selected account IDs or approval capabilities.
        try {
          const result = await ctx.runMutation(internal.accounts.runAgentTool, {
            accountId,
            name,
            arguments: args,
            requestText: value,
          });
          toolResults.push({ name, result });
          return result;
        } catch (error) {
          const result = {
            error:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : "Tool failed",
          };
          toolResults.push({ name, result });
          return result;
        }
      });
    } catch (error) {
      if (!toolResults.length) throw error;
      reply =
        "The AI explanation could not complete. Review the recorded calculation details below. If a payment proposal was prepared, it remains available in Payments for your review. These tools cannot approve or execute a payment; no funds moved. Check the current proposal before trying preparation again.";
    }
    await ctx.runMutation(internal.accounts.saveChatExchange, {
      accountId,
      ...(chatId ? { chatId } : {}),
      text: value,
      reply,
      toolResults,
    });
  },
});

export const addCountryAccount = mutation({
  args: { accountId: v.id("accounts"), country: v.string(), label: v.string() },
  handler: async (ctx, { accountId, country, label }) => {
    await requireAccount(ctx, accountId);
    const selectedCountry = getCountry(country.trim());
    if (!selectedCountry) throw new Error("Choose a supported country");
    if (!country.trim() || !label.trim())
      throw new Error("Country and account name are required");
    if (!(await ctx.db.get(accountId))) throw new Error("Account not found");
    const rows = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const row = rows.find((item) => item.key === "profile");
    const value = {
      ...(row?.value ?? {}),
      countryAccounts: [
        ...(row?.value?.countryAccounts ?? []),
        {
          country: selectedCountry.name,
          currency: selectedCountry.currency,
          label: label.trim(),
        },
      ],
    };
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("appConfig", { accountId, key: "profile", value });
  },
});

export const resetPayment = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    await requireAccount(ctx, accountId);
    const account = await ctx.db.get(accountId);
    if (!account) throw new Error("Account not found");
    const proposals = await ctx.db
      .query("paymentProposals")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    for (const proposal of proposals)
      if (proposal.status === "prepared" || proposal.status === "approved")
        await ctx.db.patch(proposal._id, { status: "cancelled" });
    await ctx.db.patch(accountId, { paymentStatus: "not_started" });
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "PAYMENT_RESET",
      detail: "Sandbox payment reset; fresh approval required",
      actor: account.name,
      timestamp: Date.now(),
    });
  },
});

export const clearChat = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    await requireAccount(ctx, accountId);
    if (!(await ctx.db.get(accountId))) throw new Error("Account not found");
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    for (const message of messages) await ctx.db.delete(message._id);
  },
});

export const runAgentTool = internalMutation({
  args: {
    accountId: v.id("accounts"),
    name: v.union(
      v.literal("compare_payment_routes"),
      v.literal("simulate_budget"),
      v.literal("prepare_tuition_payment"),
      v.literal("stress_test_fx"),
    ),
    arguments: v.any(),
    requestText: v.string(),
  },
  handler: async (ctx, { accountId, name, arguments: args, requestText }) => {
    const account = await requireAccount(ctx, accountId);
    if (account.role !== "Student") throw new Error("Student account required");
    if (!account.aiConsentAt)
      throw new Error("AI processing consent has been revoked");
    if (!args || typeof args !== "object" || Array.isArray(args))
      throw new Error("Invalid tool arguments");
    const keys = Object.keys(args);
    if (
      keys.some(
        (key) =>
          !(
            (name === "simulate_budget" && key === "monthlyRent") ||
            (name === "stress_test_fx" && key === "adversePercent")
          ),
      )
    )
      throw new Error("Unexpected tool arguments");
    if (name === "prepare_tuition_payment") {
      // Preparation changes no funds; approval and execution remain separate public owner actions.
      // Require a direct preparation verb in this turn rather than relying on the model alone.
      if (!hasPreparationIntent(requestText))
        throw new Error(
          "Ask explicitly to prepare or draft a payment; approval is always separate",
        );
      const proposal = await paymentTransition(ctx, accountId, "prepared");
      const result = {
        sandbox: true,
        proposal: proposal
          ? {
              proposalId: proposal._id,
              recipient: proposal.recipient,
              provider: proposal.provider,
              sourceCurrency: proposal.sourceCurrency,
              targetCurrency: proposal.targetCurrency,
              amountGBP: proposal.amountMinor / 100,
              totalUSD: proposal.totalMinor / 100,
              status: proposal.status,
              expiresAt: proposal.expiresAt,
            }
          : null,
        nextStep:
          "Open Payments, review the quote, approve and send. No funds moved.",
      };
      await ctx.db.insert("toolExecutions", {
        accountId,
        name,
        arguments: args,
        result,
        timestamp: Date.now(),
      });
      return result;
    }
    const costs = await ctx.db
      .query("costs")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    let result: unknown;
    if (name === "compare_payment_routes") {
      const banking = config.find((row) => row.key === "banking")?.value;
      const amount = banking?.paymentAmount;
      if (!Number.isFinite(amount) || amount <= 0)
        throw new Error("Set a tuition amount in the sandbox first");
      const routes = await ctx.db
        .query("paymentRoutes")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect();
      const security = config.find((row) => row.key === "security")?.value;
      result = assessTuition({
        currency: studyCurrency(account.countryTo),
        amountGBP: amount,
        reserveGBP:
          security?.protectedReserveGBP ??
          convertMoney(1000, "GBP", studyCurrency(account.countryTo)),
        wallets,
        routes,
        deadline: banking?.tuitionDeadline,
        bufferBusinessDays: banking?.bufferBusinessDays ?? 1,
        now: Date.now(),
      });
    } else if (name === "stress_test_fx") {
      const percent = args.adversePercent;
      if (
        typeof percent !== "number" ||
        !Number.isFinite(percent) ||
        percent < 0 ||
        percent > 30
      )
        throw new Error("FX shock must be between 0% and 30%");
      const currentGBP = wallets.reduce(
        (sum, w) => sum + walletValue(w, studyCurrency(account.countryTo)),
        0,
      );
      const stressedGBP = wallets.reduce(
        (sum, w) =>
          sum +
          walletValue(w, studyCurrency(account.countryTo)) *
            (w.currency === studyCurrency(account.countryTo)
              ? 1
              : 1 - percent / 100),
        0,
      );
      result = {
        hypothetical: true,
        currency: studyCurrency(account.countryTo),
        adversePercent: percent,
        currentGBP: Math.round(currentGBP * 100) / 100,
        stressedGBP: Math.round(stressedGBP * 100) / 100,
        lossGBP: Math.round((currentGBP - stressedGBP) * 100) / 100,
        assumptions: `Foreign wallet valuations fall by the requested percentage; ${studyCurrency(account.countryTo)} balances stay constant. Scenario only, not an FX forecast. No records changed.`,
      };
    } else {
      const rent = args.monthlyRent;
      if (
        typeof rent !== "number" ||
        !Number.isFinite(rent) ||
        rent < 0 ||
        rent > 100000
      )
        throw new Error(
          `Monthly rent must be between 0 and 100,000 ${studyCurrency(account.countryTo)}`,
        );
      const monthly = costs.filter((c) =>
        /monthly|living|rent|food|transport|utilities/i.test(
          c.category + " " + c.name,
        ),
      );
      const currentRent = monthly
        .filter((c) => /rent|accommodation/i.test(c.name))
        .reduce((sum, c) => sum + c.amount / 12, 0);
      const otherMonthly = monthly
        .filter((c) => !/rent|accommodation/i.test(c.name))
        .reduce((sum, c) => sum + c.amount / 12, 0);
      const liquidGBP = wallets.reduce(
        (sum, w) => sum + walletValue(w, studyCurrency(account.countryTo)),
        0,
      );
      result = {
        hypothetical: true,
        currency: studyCurrency(account.countryTo),
        monthlyRent: rent,
        otherMonthly,
        monthlyBurn: rent + otherMonthly,
        liquidGBP,
        runwayMonths:
          rent + otherMonthly > 0 ? liquidGBP / (rent + otherMonthly) : null,
        monthlyChange: rent - currentRent,
        assumptions:
          "Plan cost items matching rent/living/food/transport/utilities are annual totals divided by 12; wallet valuations in the study currency are sandbox estimates. No records changed.",
      };
    }
    await ctx.db.insert("toolExecutions", {
      accountId,
      name,
      arguments: args,
      result,
      timestamp: Date.now(),
    });
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "AGENT_TOOL",
      detail: `${name}: deterministic calculation completed; no funds moved`,
      actor: "MoveWise",
      timestamp: Date.now(),
    });
    return result;
  },
});

export const initializePaymentSandbox = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await requireAccount(ctx, accountId);
    if (account.role !== "Student") throw new Error("Student account required");
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    await syncWorkspaceCurrency(ctx, account);
    const currency = studyCurrency(account.countryTo);
    if (config.some((row) => row.key === "banking"))
      throw new Error("Payment sandbox already exists");
    await ctx.db.insert("appConfig", {
      accountId,
      key: "banking",
      value: {
        recipient:
          account.university ||
          `Example ${account.countryTo || "UK"} University`,
        currency,
        recipientAccountLast4: "1842",
        paymentAmount: convertMoney(2000, "GBP", currency),
        recipientVerified: false,
        sandbox: true,
        tuitionDeadline: new Date(Date.now() + 14 * 86400000)
          .toISOString()
          .slice(0, 10),
        bufferBusinessDays: 1,
      },
    });
    await ctx.db.insert("appConfig", {
      accountId,
      key: "security",
      value: {
        currency,
        paymentLimit: convertMoney(2500, "GBP", currency),
        approvalExpiryMinutes: 10,
        protectedReserveGBP: convertMoney(1000, "GBP", currency),
      },
    });
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    if (!wallets.some((w) => w.currency === "USD"))
      await ctx.db.insert("wallets", {
        accountId,
        currency: "USD",
        symbol: "$",
        amount: 5000,
        gbpValue: 3870,
        label: "Sandbox USD balance · simulated",
      });
    const routes = [
      {
        key: "sandbox-standard",
        provider: "Wise",
        fxRate: 0.774,
        fee: 8.4,
        delivery: "1–2 business days",
        maxBusinessDays: 2,
        recommended: true,
      },
      {
        key: "sandbox-bank",
        provider: "SWIFT bank transfer",
        fxRate: 0.768,
        fee: 34,
        delivery: "3–5 business days",
        maxBusinessDays: 5,
        recommended: false,
      },
      {
        key: "sandbox-fast",
        provider: "Debit / credit card",
        fxRate: 0.77,
        fee: 26,
        delivery: "Within 1 business day",
        maxBusinessDays: 1,
        recommended: false,
      },
    ];
    for (const route of routes)
      await ctx.db.insert("paymentRoutes", {
        accountId,
        ...route,
        sourceCurrency: "USD",
        targetCurrency: currency,
        fxRate:
          currency === "USD" ? 1 : route.fxRate * currencyRate("GBP", currency),
        quotedAt: Date.now(),
        quoteExpiresAt: Date.now() + 10 * 60 * 1000,
        sourceAmount: Math.ceil(200000 / route.fxRate) / 100,
      });
    await ctx.db.patch(accountId, { selectedRoute: routes[0].key });
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "SANDBOX_INITIALIZED",
      detail:
        "Owner loaded illustrative tuition quotes and a simulated USD wallet; no real account connected",
      actor: account.name,
      timestamp: Date.now(),
    });
  },
});

export const setAIConsent = mutation({
  args: { accountId: v.id("accounts"), enabled: v.boolean() },
  handler: async (ctx, { accountId, enabled }) => {
    const account = await requireAccount(ctx, accountId);
    await ctx.db.patch(accountId, {
      aiConsentAt: enabled ? Date.now() : undefined,
    });
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "AI_CONSENT",
      detail: enabled
        ? "Owner enabled external AI processing of chat and minimized financial summaries"
        : "Owner revoked external AI processing",
      actor: account.name,
      timestamp: Date.now(),
    });
  },
});

export const reserveAIRequest = internalMutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await requireAccount(ctx, accountId);
    if (!account.aiConsentAt)
      throw new Error("Enable AI processing before sending a message");
    if (account.aiLastRequestAt && Date.now() - account.aiLastRequestAt < 10000)
      throw new Error("Wait 10 seconds between AI requests");
    const day = new Date().toISOString().slice(0, 10);
    const count =
      account.aiRequestDay === day ? (account.aiDailyRequests ?? 0) : 0;
    if (count >= 100)
      throw new Error(
        "Daily AI limit reached (100 requests per UTC day). Use Payments for deterministic planning.",
      );
    await ctx.db.patch(accountId, {
      aiLastRequestAt: Date.now(),
      aiRequestDay: day,
      aiDailyRequests: count + 1,
    });
  },
});

export const updateTuitionPlan = mutation({
  args: {
    accountId: v.id("accounts"),
    deadline: v.string(),
    bufferBusinessDays: v.number(),
    protectedReserveGBP: v.number(),
  },
  handler: async (
    ctx,
    { accountId, deadline, bufferBusinessDays, protectedReserveGBP },
  ) => {
    const account = await requireAccount(ctx, accountId);
    if (account.role !== "Student") throw new Error("Student account required");
    if (account.paymentStatus !== "not_started")
      throw new Error("Reset the active payment before changing its plan");
    parseDeadline(deadline);
    const today = new Date().toISOString().slice(0, 10);
    if (deadline < today || Date.parse(deadline) > Date.now() + 366 * 86400000)
      throw new Error("Deadline must be today or within the next year");
    if (
      !Number.isInteger(bufferBusinessDays) ||
      bufferBusinessDays < 0 ||
      bufferBusinessDays > 5 ||
      !Number.isFinite(protectedReserveGBP) ||
      protectedReserveGBP < 0 ||
      protectedReserveGBP >
        convertMoney(1000000, "GBP", studyCurrency(account.countryTo)) ||
      !Number.isSafeInteger(Math.round(protectedReserveGBP * 100))
    )
      throw new Error("Invalid reserve or safety buffer");
    const rows = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const banking = rows.find((r) => r.key === "banking"),
      security = rows.find((r) => r.key === "security");
    if (!banking || !security)
      throw new Error("Load the payment sandbox first");
    await ctx.db.patch(banking._id, {
      value: {
        ...banking.value,
        tuitionDeadline: deadline,
        bufferBusinessDays,
      },
    });
    await ctx.db.patch(security._id, {
      value: {
        ...security.value,
        currency: studyCurrency(account.countryTo),
        protectedReserveGBP: Math.round(protectedReserveGBP * 100) / 100,
      },
    });
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "TUITION_PLAN_UPDATED",
      detail: `Deadline ${deadline}; ${bufferBusinessDays} business-day buffer; protected ${studyCurrency(account.countryTo)} ${protectedReserveGBP}`,
      actor: account.name,
      timestamp: Date.now(),
    });
  },
});

export const refreshSandboxQuotes = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await requireAccount(ctx, accountId);
    if (account.role !== "Student") throw new Error("Student account required");
    if (account.paymentStatus !== "not_started")
      throw new Error("Reset the active payment before refreshing quotes");
    const routes = await ctx.db
      .query("paymentRoutes")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const windows: Record<string, number> = {
      wise: 1,
      swift: 5,
      card: 1,
      "sandbox-standard": 2,
      "sandbox-bank": 5,
      "sandbox-fast": 1,
    };
    let updated = 0;
    for (const route of routes) {
      // Only known fixtures can be refreshed; never invent current observations for other records.
      if (windows[route.key] === undefined) continue;
      await ctx.db.patch(route._id, {
        fxRate: studyCurrency(account.countryTo) === "USD" ? 1 : sandboxRouteGBPPerUSD[route.key] * currencyRate("GBP", studyCurrency(account.countryTo)),
        quotedAt: Date.now(),
        quoteExpiresAt: Date.now() + 600000,
        maxBusinessDays: windows[route.key],
        sourceCurrency: "USD",
        targetCurrency: studyCurrency(account.countryTo),
      });
      updated++;
    }
    if (!updated) throw new Error("No refreshable sandbox quotes");
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "SANDBOX_QUOTES_REFRESHED",
      detail:
        "Reissued illustrative fixture quotes for 10 minutes; no provider request or live rate",
      actor: account.name,
      timestamp: Date.now(),
    });
  },
});

export const updatePaymentDetails = mutation({
  args: {
    accountId: v.id("accounts"),
    amount: v.number(),
    recipient: v.string(),
    last4: v.string(),
  },
  handler: async (ctx, { accountId, amount, recipient, last4 }) => {
    const account = await requireAccount(ctx, accountId);
    if (account.role !== "Student") throw new Error("Student account required");
    if (account.paymentStatus !== "not_started")
      throw new Error("Reset the active payment before editing details");
    if (
      !Number.isFinite(amount) ||
      amount < 0.01 ||
      amount > convertMoney(1000000, "GBP", studyCurrency(account.countryTo)) ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 ||
      !recipient.trim() ||
      recipient.trim().length > 160 ||
      !/^\d{4}$/.test(last4)
    )
      throw new Error("Invalid payment details");
    const rows = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const banking = rows.find((r) => r.key === "banking");
    if (!banking) throw new Error("Load the payment sandbox first");
    await ctx.db.patch(banking._id, {
      value: {
        ...banking.value,
        currency: studyCurrency(account.countryTo),
        paymentAmount: Math.round(amount * 100) / 100,
        recipient: recipient.trim(),
        recipientAccountLast4: last4,
        recipientVerified: false,
      },
    });
    await ctx.db.insert("auditEvents", {
      accountId,
      type: "PAYMENT_DETAILS_UPDATED",
      detail:
        "Tuition details changed; recipient confirmation required and quotes recalculated",
      actor: account.name,
      timestamp: Date.now(),
    });
  },
});

export const saveMovePlan = mutation({
  args: {
    accountId: v.id("accounts"),
    months: v.number(),
    selectedRoute: v.number(),
    arrivalDate: v.string(),
    excludedCosts: v.array(v.string()),
    budgetAmounts: v.any(),
    plannerSettings: v.optional(v.object({
      university: v.number(), housing: v.number(), flightOption: v.number(),
      insuranceOption: v.number(), lifestyle: v.number(), depositMonths: v.number(),
      contingency: v.number(), livingMode: v.union(v.literal("daily"), v.literal("monthly")),
      fundingOption: v.number(), proofOption: v.number(),
    })),
  },
  handler: async (
    ctx,
    {
      accountId,
      months,
      selectedRoute,
      arrivalDate,
      excludedCosts,
      budgetAmounts,
      plannerSettings,
    },
  ) => {
    const account = await requireAccount(ctx, accountId);
    if (account.role !== "Student") throw new Error("Student account required");
    parseDeadline(arrivalDate);
    if (plannerSettings !== undefined) validateMoveSettings(plannerSettings);
    if (
      !Number.isInteger(months) ||
      months < 1 ||
      months > 24 ||
      !Number.isInteger(selectedRoute) ||
      selectedRoute < 0 ||
      selectedRoute > 50 ||
      !budgetAmounts ||
      Array.isArray(budgetAmounts) ||
      Object.values(budgetAmounts).some(
        (value) =>
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < 0 ||
          value >
            convertMoney(1000000, "GBP", studyCurrency(account.countryTo)),
      )
    )
      throw new Error("Invalid move plan");
    const row = (
      await ctx.db
        .query("appConfig")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect()
    ).find((row) => row.key === "move");
    const value = {
      ...(row?.value ?? {}),
      months,
      selectedRoute,
      arrivalDateISO: arrivalDate,
      excludedCosts,
      budgetAmounts,
      ...(plannerSettings !== undefined ? { plannerSettings } : {}),
      currency: studyCurrency(account.countryTo),
      fixtureCurrency: row?.value?.fixtureCurrency ?? "GBP",
    };
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("appConfig", { accountId, key: "move", value });
  },
});

export const syncPaymentReminder = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await requireAccount(ctx, accountId);
    if (account.role !== "Student" || account.paymentStatus === "completed")
      return;
    const rows = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const banking = rows.find((row) => row.key === "banking")?.value;
    if (
      !banking?.tuitionDeadline ||
      !Number.isFinite(banking.paymentAmount) ||
      banking.paymentAmount <= 0
    )
      return;
    const due = parseDeadline(banking.tuitionDeadline),
      days = Math.ceil((due - Date.now()) / 86400000);
    if (days < 0 || days > 14) return;
    const title = `Tuition due ${banking.tuitionDeadline}`;
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    if (
      notifications.some((n) => n.title === title) ||
      notifications.some(
        (n) =>
          n.title.startsWith("Tuition due ") &&
          Date.now() - n.timestamp < 86400000,
      )
    )
      return;
    await ctx.db.insert("notifications", {
      accountId,
      title,
      detail: `Your saved ${studyCurrency(account.countryTo)} ${banking.paymentAmount.toFixed(2)} payment to ${banking.recipient || "your university"} is due within ${Math.max(0, days)} days. Review your payment plan.`,
      read: false,
      timestamp: Date.now(),
    });
  },
});
