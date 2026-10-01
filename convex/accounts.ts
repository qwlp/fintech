import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

const DEMO_EMAIL = "dara@financialpassport.demo";

export const bootstrap = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!account) return null;
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
      paymentRoutes,
      auditEvents,
      messages,
      notifications,
      checklist: checklist.sort((a, b) => a.position - b.position),
      config: Object.fromEntries(configRows.map((row) => [row.key, row.value])),
      sponsorRequests,
      rateAlerts,
    };
  },
});

export const seedDemo = mutation({
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
        provider: "Provider A",
        sourceAmount: 2574.6,
        fee: 8.4,
        fxRate: 0.774,
        delivery: "1 business day",
        recommended: true,
      },
      {
        key: "swift",
        provider: "Bank SWIFT",
        sourceAmount: 2607,
        fee: 34,
        fxRate: 0.768,
        delivery: "3–5 business days",
      },
      {
        key: "card",
        provider: "International card",
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
        "Financial Passport",
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
  handler: async (ctx, args) =>
    ctx.db.patch(args.accountId, { selectedRoute: args.route }),
});
export const toggleChecklist = mutation({
  args: { accountId: v.id("accounts"), key: v.string() },
  handler: async (ctx, args) => {
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
    await ctx.db.patch(args.accountId, { sponsorRequestSent: true });
    await ctx.db.insert("auditEvents", {
      accountId: args.accountId,
      type: "SPONSOR_REQUESTED",
      detail: "Contribution request sent for £1,000",
      actor: "Dara Chan",
      timestamp: Date.now(),
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
    const {
      accountId,
      courseStart,
      financialStatus,
      sponsorSupport,
      fundingAmount,
      ...account
    } = args;
    if (!Number.isFinite(fundingAmount) || fundingAmount < 0) throw new Error("Invalid confirmed funding amount");
    const initials = account.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
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
    if (!Number.isFinite(args.amount) || args.amount <= 0)
      throw new Error("Amount must be positive");
    await ctx.db.insert("sponsorRequests", {
      ...args,
      status: "sent",
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.accountId, { sponsorRequestSent: true });
    await ctx.db.insert("auditEvents", {
      accountId: args.accountId,
      type: "SPONSOR_REQUESTED",
      detail: `${args.purpose} contribution requested for £${args.amount.toLocaleString("en-GB")}`,
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
    const sponsor = (
      await ctx.db
        .query("sponsors")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
        .collect()
    ).find((item) => item.key === args.sponsorKey);
    if (!sponsor) throw new Error("Sponsor not found");
    const permissions = args.enabled
      ? Array.from(new Set([...sponsor.permissions, args.permission]))
      : sponsor.permissions.filter(
          (permission: string) => permission !== args.permission,
        );
    await ctx.db.patch(sponsor._id, { permissions });
  },
});

export const createRateAlert = mutation({
  args: {
    accountId: v.id("accounts"),
    pair: v.string(),
    targetRate: v.number(),
  },
  handler: async (ctx, args) => {
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
        if (Object.keys(defaults).some((field) => row.value?.[field] === undefined))
          await ctx.db.patch(row._id, { value });
      }
    }
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
  },
  handler: async (ctx, { accountId, next }) => {
    const account = await ctx.db.get(accountId);
    if (!account) throw new Error("Account not found");
    const configRow = (
      await ctx.db
        .query("appConfig")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect()
    ).find((row) => row.key === "banking");
    const banking = (configRow?.value ?? {}) as Record<string, any>;
    const route = (
      await ctx.db
        .query("paymentRoutes")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect()
    ).find((item) => item.key === account.selectedRoute);
    const amount = Number(banking.paymentAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0 || !route || route.fxRate <= 0)
      throw new Error("Payment details unavailable");
    const allowed: Record<string, string> = {
      not_started: "prepared",
      prepared: "approved",
      approved: "completed",
    };
    if (allowed[account.paymentStatus] !== next)
      throw new Error(
        `Invalid payment transition: ${account.paymentStatus} → ${next}`,
      );
    await ctx.db.patch(accountId, { paymentStatus: next });
    const event =
      next === "prepared"
        ? [
            "PAYMENT_PREPARED",
            `${amount.toLocaleString("en-GB", { style: "currency", currency: "GBP" })} tuition payment prepared; no funds moved`,
            "Financial Passport",
          ]
        : next === "approved"
          ? [
              "PAYMENT_APPROVED",
              `Explicit approval recorded for ${amount.toLocaleString("en-GB", { style: "currency", currency: "GBP" })} tuition payment`,
              account.name,
            ]
          : [
              "PAYMENT_EXECUTED",
              `Sandbox transaction ${banking.transactionReference ?? "pending"} completed`,
              `Sandbox ${route?.provider ?? "provider"}`,
            ];
    await ctx.db.insert("auditEvents", {
      accountId,
      type: event[0],
      detail: event[1],
      actor: event[2],
      timestamp: Date.now(),
    });
    if (next === "completed")
      await ctx.db.insert("notifications", {
        accountId,
        title: "Payment completed",
        detail: `${amount.toLocaleString("en-GB", { style: "currency", currency: "GBP" })} was delivered in the sandbox.`,
        read: false,
        timestamp: Date.now(),
      });
  },
});

export const sendMessage = mutation({
  args: { accountId: v.id("accounts"), text: v.string() },
  handler: async (ctx, { accountId, text }) => {
    const value = text.trim();
    if (!value) return;
    await ctx.db.insert("messages", {
      accountId,
      from: "user",
      text: value,
      timestamp: Date.now(),
    });
    const [costRows, fundingRows, routeRows, configRows] = await Promise.all([
      ctx.db
        .query("costs")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("funding")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("paymentRoutes")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
      ctx.db
        .query("appConfig")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect(),
    ]);
    const totalCost = costRows.reduce((sum, item) => sum + item.amount, 0);
    const totalFunding = fundingRows
      .filter((item) => item.status === "confirmed")
      .reduce((sum, item) => sum + item.amount, 0);
    const gap = Math.max(0, totalCost - totalFunding);
    const coverage = totalCost
      ? Math.min(100, (totalFunding / totalCost) * 100)
      : 0;
    const bestRoute = [...routeRows].sort(
      (a, b) => a.sourceAmount + a.fee - (b.sourceAmount + b.fee),
    )[0];
    const banking = (configRows.find((row) => row.key === "banking")?.value ??
      {}) as Record<string, any>;
    const q = value.toLowerCase();
    const reply = q.includes("rent")
      ? `Your current confirmed funding gap is ${gap.toLocaleString("en-GB", { style: "currency", currency: "GBP" })}. Compare any rent change against the recurring housing cost in your plan before committing.`
      : q.includes("pay") || q.includes("tuition")
        ? `Your ${Number(banking.paymentAmount ?? 0).toLocaleString("en-GB", { style: "currency", currency: "GBP" })} instalment is ready for review. ${bestRoute?.provider ?? "The selected provider"} currently has the lowest stored total cost. Execution still requires your explicit approval.`
        : `Your plan is ${Math.round(coverage)}% funded with a ${gap.toLocaleString("en-GB", { style: "currency", currency: "GBP" })} gap. Review the next unpaid obligation and any pending sponsor request.`;
    await ctx.db.insert("messages", {
      accountId,
      from: "agent",
      text: reply,
      timestamp: Date.now() + 1,
    });
  },
});

export const addCountryAccount = mutation({
  args: { accountId: v.id("accounts"), country: v.string(), label: v.string() },
  handler: async (ctx, { accountId, country, label }) => {
    if (!country.trim() || !label.trim()) throw new Error("Country and account name are required");
    if (!(await ctx.db.get(accountId))) throw new Error("Account not found");
    const rows = await ctx.db.query("appConfig").withIndex("by_account", (q) => q.eq("accountId", accountId)).collect();
    const row = rows.find((item) => item.key === "profile");
    const value = { ...(row?.value ?? {}), countryAccounts: [...(row?.value?.countryAccounts ?? []), { country: country.trim(), label: label.trim() }] };
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("appConfig", { accountId, key: "profile", value });
  },
});

export const resetPayment = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) throw new Error("Account not found");
    await ctx.db.patch(accountId, { paymentStatus: "not_started" });
    await ctx.db.insert("auditEvents", { accountId, type: "PAYMENT_RESET", detail: "Sandbox payment reset; fresh approval required", actor: account.name, timestamp: Date.now() });
  },
});

export const clearChat = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    if (!await ctx.db.get(accountId)) throw new Error("Account not found");
    const messages = await ctx.db.query("messages").withIndex("by_account", (q) => q.eq("accountId", accountId)).collect();
    for (const message of messages) await ctx.db.delete(message._id);
  },
});
