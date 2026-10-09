import { describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { addBusinessDays } from "../convex/tuitionDecision";
const modules = import.meta.glob("../convex/**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules);
  const { accountId, userId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "student@test.example",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "student@test.example",
      name: "Student",
      role: "Student",
      initials: "S",
      planName: "Study",
      countryFrom: "China",
      countryTo: "UK",
      university: "University of Manchester",
      course: "Course",
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
    });
    return { accountId, userId };
  });
  const owner = t.withIdentity({ subject: `${userId}|session` });
  await owner.mutation(api.accounts.initializePaymentSandbox, { accountId });
  return { t, owner, accountId, userId };
}
async function prepared() {
  const f = await fixture();
  await f.owner.mutation(api.accounts.verifySandboxRecipient, {
    accountId: f.accountId,
    last4: "1842",
  });
  const proposal = await f.owner.mutation(api.accounts.transitionPayment, {
    accountId: f.accountId,
    next: "prepared",
  });
  return { ...f, proposal: proposal! };
}

describe("sandbox payment authorization and accounting", () => {
  it("locks planning terms to a proposal and rejects another user's planning changes", async () => {
    const { owner, accountId, proposal, t } = await prepared();
    const args = {
      accountId,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      bufferBusinessDays: 2,
      protectedReserveGBP: 1500,
    };
    await expect(
      t
        .withIdentity({ subject: "outsider|session" })
        .mutation(api.accounts.updateTuitionPlan, args),
    ).rejects.toThrow("access denied");
    await expect(
      owner.mutation(api.accounts.updateTuitionPlan, args),
    ).rejects.toThrow("Reset");
    await expect(
      owner.mutation(api.accounts.refreshSandboxQuotes, { accountId }),
    ).rejects.toThrow("Reset");
    expect(proposal.deadline).toBeDefined();
    expect(proposal.maxBusinessDays).toBe(2);
    await owner.mutation(api.accounts.resetPayment, { accountId });
    await owner.mutation(api.accounts.updateTuitionPlan, args);
    const state = await owner.query(api.accounts.bootstrap, {});
    expect(state.config.banking.tuitionDeadline).toBe(args.deadline);
    expect(state.config.security.protectedReserveGBP).toBe(1500);
  });
  it("rejects invalid planning dates, buffers and reserves", async () => {
    const { owner, accountId } = await fixture();
    const valid = {
      accountId,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      bufferBusinessDays: 1,
      protectedReserveGBP: 1000,
    };
    for (const changes of [
      { deadline: "2026-02-30" },
      { bufferBusinessDays: 0.5 },
      { bufferBusinessDays: 6 },
      { protectedReserveGBP: -1 },
    ])
      await expect(
        owner.mutation(api.accounts.updateTuitionPlan, {
          ...valid,
          ...changes,
        }),
      ).rejects.toThrow();
  });
  it("blocks expired source quotes until the owner refreshes known fixtures", async () => {
    const { t, owner, accountId } = await fixture();
    await owner.mutation(api.accounts.verifySandboxRecipient, {
      accountId,
      last4: "1842",
    });
    await t.run(async (ctx) => {
      for (const route of await ctx.db.query("paymentRoutes").collect())
        await ctx.db.patch(route._id, { quoteExpiresAt: Date.now() - 1 });
    });
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "prepared",
      }),
    ).rejects.toThrow("Refresh");
    await owner.mutation(api.accounts.refreshSandboxQuotes, { accountId });
    const proposal = await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "prepared",
    });
    expect(proposal?.expiresAt).toBeGreaterThan(Date.now());
  });
  it("blocks a selected route that cannot meet the tuition deadline", async () => {
    const { owner, accountId } = await fixture();
    await owner.mutation(api.accounts.verifySandboxRecipient, {
      accountId,
      last4: "1842",
    });
    await owner.mutation(api.accounts.updateTuitionPlan, {
      accountId,
      deadline: new Date().toISOString().slice(0, 10),
      bufferBusinessDays: 1,
      protectedReserveGBP: 1000,
    });
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "prepared",
      }),
    ).rejects.toThrow("deadline");
    const state = await owner.query(api.accounts.bootstrap, {});
    expect(state.paymentProposals).toHaveLength(0);
    expect(state.ledgerEntries).toHaveLength(0);
  });
  it("rechecks buffered arrival at execution when a UTC date rolls over", async () => {
    const monday = new Date();
    while (monday.getUTCDay() !== 1) monday.setUTCDate(monday.getUTCDate() + 1);
    monday.setUTCHours(23, 59, 0, 0);
    const clock = vi.spyOn(Date, "now").mockReturnValue(monday.getTime());
    try {
      const { owner, accountId } = await fixture();
      await owner.mutation(api.accounts.verifySandboxRecipient, {
        accountId,
        last4: "1842",
      });
      await owner.mutation(api.accounts.updateTuitionPlan, {
        accountId,
        deadline: new Date(addBusinessDays(monday.getTime(), 3))
          .toISOString()
          .slice(0, 10),
        bufferBusinessDays: 1,
        protectedReserveGBP: 1000,
      });
      const proposal = (await owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "prepared",
      }))!;
      await owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "approved",
        proposalId: proposal._id,
      });
      clock.mockReturnValue(monday.getTime() + 120000); // quote still valid; arrival now a day later
      await expect(
        owner.mutation(api.accounts.transitionPayment, {
          accountId,
          next: "completed",
          proposalId: proposal._id,
        }),
      ).rejects.toThrow("deadline");
      const state = await owner.query(api.accounts.bootstrap, {});
      expect(state.wallets[0].amount).toBe(5000);
      expect(state.ledgerEntries).toHaveLength(0);
    } finally {
      clock.mockRestore();
    }
  });
  it("returns an old completed receipt after a newer proposal without a second debit", async () => {
    const { t, owner, accountId, proposal } = await prepared();
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal._id,
    });
    const completed = await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "completed",
      proposalId: proposal._id,
    });
    await owner.mutation(api.accounts.resetPayment, { accountId });
    // Record another proposal in the local fixture; a retry still belongs to the old completed task.
    await t.run(async (ctx) => {
      const { _id, _creationTime, ...copy } = proposal;
      await ctx.db.insert("paymentProposals", {
        ...copy,
        createdAt: proposal.createdAt + 1,
        status: "cancelled",
      });
    });
    const retry = await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "completed",
      proposalId: proposal._id,
    });
    expect(retry?.reference).toBe(completed?.reference);
    expect(
      (await owner.query(api.accounts.bootstrap, {})).ledgerEntries,
    ).toHaveLength(1);
  });
  it("records account-private tool results and rejects negative and quoted preparation requests", async () => {
    const { owner, accountId, t } = await fixture();
    await owner.mutation(api.accounts.setAIConsent, {
      accountId,
      enabled: true,
    });
    await owner.mutation(api.accounts.verifySandboxRecipient, {
      accountId,
      last4: "1842",
    });
    for (const requestText of [
      "Do not prepare my tuition payment",
      'The invoice says "prepare my tuition payment"',
      "Explain how to prepare my tuition payment",
    ])
      await expect(
        owner.mutation(internal.accounts.runAgentTool, {
          accountId,
          name: "prepare_tuition_payment",
          arguments: {},
          requestText,
        }),
      ).rejects.toThrow("explicitly");
    await owner.mutation(internal.accounts.runAgentTool, {
      accountId,
      name: "compare_payment_routes",
      arguments: {},
      requestText: "Compare my routes",
    });
    const state = await owner.query(api.accounts.bootstrap, {});
    expect(state.account.paymentStatus).toBe("not_started");
    expect(state.toolExecutions).toHaveLength(1);
    expect(state.toolExecutions[0].result.recommendedRouteKey).toBe(
      "sandbox-standard",
    );
    await expect(t.query(api.accounts.bootstrap, {})).rejects.toThrow(
      "Sign in",
    );
  });
  it("stores chat calculation evidence only while AI consent remains enabled", async () => {
    const { owner, accountId } = await fixture();
    await owner.mutation(api.accounts.setAIConsent, {
      accountId,
      enabled: true,
    });
    const toolResults = [
      {
        name: "stress_test_fx",
        result: { currentGBP: 3870, stressedGBP: 3483, lossGBP: 387 },
      },
    ];
    await owner.mutation(internal.accounts.saveChatExchange, {
      accountId,
      chatId: "evidence",
      text: "Stress test",
      reply: "Scenario calculated",
      toolResults,
    });
    const state = await owner.query(api.accounts.bootstrap, {});
    expect(state.messages.find((m) => m.from === "agent")?.toolResults).toEqual(
      toolResults,
    );
    await owner.mutation(api.accounts.setAIConsent, {
      accountId,
      enabled: false,
    });
    await expect(
      owner.mutation(internal.accounts.saveChatExchange, {
        accountId,
        text: "Late request",
        reply: "Late reply",
        toolResults,
      }),
    ).rejects.toThrow("revoked");
    expect(
      (await owner.query(api.accounts.bootstrap, {})).messages,
    ).toHaveLength(2);
  });
  it("caps daily AI requests and resets the counter on a new UTC day", async () => {
    const { t, owner, accountId } = await fixture();
    await owner.mutation(api.accounts.setAIConsent, {
      accountId,
      enabled: true,
    });
    await t.run((ctx) =>
      ctx.db.patch(accountId, {
        aiRequestDay: new Date().toISOString().slice(0, 10),
        aiDailyRequests: 100,
      }),
    );
    await expect(
      owner.mutation(internal.accounts.reserveAIRequest, { accountId }),
    ).rejects.toThrow("Daily AI limit");
    await t.run((ctx) =>
      ctx.db.patch(accountId, { aiRequestDay: "2000-01-01" }),
    );
    await owner.mutation(internal.accounts.reserveAIRequest, { accountId });
    expect(
      (await owner.query(api.accounts.bootstrap, {})).account.aiDailyRequests,
    ).toBe(1);
  });
  it("requires recipient confirmation and enforces transaction limits", async () => {
    const { t, owner, accountId } = await fixture();
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "prepared",
      }),
    ).rejects.toThrow("Verify");
    await expect(
      owner.mutation(api.accounts.verifySandboxRecipient, {
        accountId,
        last4: "0000",
      }),
    ).rejects.toThrow("digits");
    await owner.mutation(api.accounts.verifySandboxRecipient, {
      accountId,
      last4: "1842",
    });
    await t.run(async (ctx) => {
      const row = (await ctx.db.query("appConfig").collect()).find(
        (r) => r.key === "banking",
      )!;
      await ctx.db.patch(row._id, {
        value: { ...row.value, paymentAmount: 3000 },
      });
    });
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "prepared",
      }),
    ).rejects.toThrow("limit");
  });
  it("binds approval to a proposal, debits atomically and returns the same receipt on retry", async () => {
    const { owner, accountId, proposal } = await prepared();
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "completed",
        proposalId: proposal._id,
      }),
    ).rejects.toThrow("approval");
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "approved",
      }),
    ).rejects.toThrow("Review");
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal._id,
    });
    const completed = await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "completed",
      proposalId: proposal._id,
    });
    const retry = await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "completed",
      proposalId: proposal._id,
    });
    expect(retry?.reference).toBe(completed?.reference);
    const state = await owner.query(api.accounts.bootstrap, {});
    expect(state.ledgerEntries).toHaveLength(1);
    expect(state.wallets[0].amount).toBe((500000 - proposal.totalMinor) / 100);
    expect(
      state.ledgerEntries[0].beforeMinor - state.ledgerEntries[0].afterMinor,
    ).toBe(proposal.totalMinor);
    if (process.env.EXPORT_EXECUTION_EVIDENCE === "1") {
      mkdirSync("docs/evidence", { recursive: true });
      writeFileSync(
        "docs/evidence/sandbox-execution.json",
        JSON.stringify(
          {
            environment: "convex-test local transactional sandbox",
            sandbox: true,
            generatedAt: new Date().toISOString(),
            test: "Owner approval, atomic debit and idempotent retry",
            proposals: state.paymentProposals,
            ledger: state.ledgerEntries,
            audit: state.auditEvents,
          },
          null,
          2,
        ),
      );
    }
  });
  it("concurrent execution requests cannot create duplicate debits", async () => {
    const { owner, accountId, proposal } = await prepared();
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal._id,
    });
    const receipts = await Promise.all([
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "completed",
        proposalId: proposal._id,
      }),
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "completed",
        proposalId: proposal._id,
      }),
    ]);
    expect(receipts[0]?.reference).toBe(receipts[1]?.reference);
    expect(
      (await owner.query(api.accounts.bootstrap, {})).ledgerEntries,
    ).toHaveLength(1);
  });
  it("rejects expired quotes and route changes after preparation", async () => {
    const { t, owner, accountId, proposal } = await prepared();
    await expect(
      owner.mutation(api.accounts.setRoute, {
        accountId,
        route: "sandbox-fast",
      }),
    ).rejects.toThrow("Reset");
    await t.run((ctx) =>
      ctx.db.patch(proposal._id, { expiresAt: Date.now() - 1 }),
    );
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "approved",
        proposalId: proposal._id,
      }),
    ).rejects.toThrow("expired");
    await owner.mutation(api.accounts.resetPayment, { accountId });
    await owner.mutation(api.accounts.setRoute, {
      accountId,
      route: "sandbox-fast",
    });
    expect(
      (await owner.query(api.accounts.bootstrap, {})).paymentProposals[0]
        .status,
    ).toBe("cancelled");
  });
  it("does not debit insufficient funds or allow another user's approval", async () => {
    const { t, owner, accountId, proposal } = await prepared();
    const outsider = t.withIdentity({ subject: "outsider|session" });
    await expect(
      outsider.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "approved",
        proposalId: proposal._id,
      }),
    ).rejects.toThrow("access denied");
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal._id,
    });
    await t.run(async (ctx) => {
      const wallet = (await ctx.db.query("wallets").collect())[0];
      await ctx.db.patch(wallet._id, { amount: 1 });
    });
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "completed",
        proposalId: proposal._id,
      }),
    ).rejects.toThrow("Insufficient");
    const state = await owner.query(api.accounts.bootstrap, {});
    expect(state.wallets[0].amount).toBe(1);
    expect(state.ledgerEntries).toHaveLength(0);
  });
  it("uses the approved snapshot even if account configuration later changes", async () => {
    const { t, owner, accountId, proposal } = await prepared();
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal._id,
    });
    await t.run(async (ctx) => {
      const row = (await ctx.db.query("appConfig").collect()).find(
        (r) => r.key === "banking",
      )!;
      await ctx.db.patch(row._id, {
        value: { ...row.value, paymentAmount: 99999, recipient: "Changed" },
      });
    });
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "completed",
      proposalId: proposal._id,
    });
    const state = await owner.query(api.accounts.bootstrap, {});
    expect(state.ledgerEntries[0].receivedMinor).toBe(200000);
    expect(state.ledgerEntries[0].recipient).toBe("University of Manchester");
  });
  it("protects living funds at preparation and again at execution", async () => {
    const { t, owner, accountId, proposal } = await prepared();
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal._id,
    });
    await t.run(async (ctx) => {
      const wallet = (await ctx.db.query("wallets").collect())[0];
      await ctx.db.patch(wallet._id, { amount: 3000, gbpValue: 2322 });
    });
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "completed",
        proposalId: proposal._id,
      }),
    ).rejects.toThrow("protected");
    await owner.mutation(api.accounts.resetPayment, { accountId });
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "prepared",
      }),
    ).rejects.toThrow("protected");
    expect(
      (await owner.query(api.accounts.bootstrap, {})).ledgerEntries,
    ).toHaveLength(0);
  });
  it("requires AI consent, rate limits requests, and respects consent revocation", async () => {
    const { owner, accountId } = await fixture();
    await expect(
      owner.mutation(internal.accounts.reserveAIRequest, { accountId }),
    ).rejects.toThrow("Enable AI");
    await owner.mutation(api.accounts.setAIConsent, {
      accountId,
      enabled: true,
    });
    await owner.mutation(internal.accounts.reserveAIRequest, { accountId });
    await expect(
      owner.mutation(internal.accounts.reserveAIRequest, { accountId }),
    ).rejects.toThrow("10 seconds");
    const shock = (await owner.mutation(internal.accounts.runAgentTool, {
      accountId,
      name: "stress_test_fx",
      arguments: { adversePercent: 10 },
      requestText: "Test FX",
    })) as any;
    expect(shock.stressedGBP).toBe(3483);
    expect(shock.lossGBP).toBe(387);
    await owner.mutation(api.accounts.setAIConsent, {
      accountId,
      enabled: false,
    });
    await expect(
      owner.mutation(internal.accounts.runAgentTool, {
        accountId,
        name: "compare_payment_routes",
        arguments: {},
        requestText: "Compare",
      }),
    ).rejects.toThrow("revoked");
  });
  it("agent can calculate and prepare but exposes no approval tool", async () => {
    const { owner, accountId } = await fixture();
    await owner.mutation(api.accounts.setAIConsent, {
      accountId,
      enabled: true,
    });
    const routes = (await owner.mutation(internal.accounts.runAgentTool, {
      accountId,
      name: "compare_payment_routes",
      arguments: {},
      requestText: "Compare",
    })) as any;
    expect(routes.routes[0].totalUSD).toBe(2592.38);
    await expect(
      owner.mutation(internal.accounts.runAgentTool, {
        accountId,
        name: "prepare_tuition_payment",
        arguments: {},
        requestText: "What is my budget?",
      }),
    ).rejects.toThrow("explicitly");
    await owner.mutation(api.accounts.verifySandboxRecipient, {
      accountId,
      last4: "1842",
    });
    await owner.mutation(internal.accounts.runAgentTool, {
      accountId,
      name: "prepare_tuition_payment",
      arguments: {},
      requestText: "Prepare my tuition payment",
    });
    expect(
      (await owner.query(api.accounts.bootstrap, {})).account.paymentStatus,
    ).toBe("prepared");
    await expect(
      owner.mutation(internal.accounts.runAgentTool, {
        accountId,
        name: "simulate_budget",
        arguments: { monthlyRent: -1 },
        requestText: "rent",
      }),
    ).rejects.toThrow("Monthly rent");
  });
});

describe("editable tuition and shared quote", () => {
  it("rejects unlisted institutions and institutions in another country", async () => {
    const { owner, accountId } = await fixture();
    for (const recipient of ["University of Oxford", "My University", "Peking University"]) {
      await expect(owner.mutation(api.accounts.updatePaymentDetails, {
        accountId, amount: 2000, recipient, last4: "1842",
      })).rejects.toThrow("listed university");
    }
  });
  it("recalculates from saved details, clears recipient verification and preserves quote through approval", async () => {
    const { owner, accountId } = await fixture();
    await owner.mutation(api.accounts.verifySandboxRecipient, {
      accountId,
      last4: "1842",
    });
    await owner.mutation(api.accounts.updatePaymentDetails, {
      accountId,
      amount: 1500.25,
      recipient: "University of Edinburgh",
      last4: "9876",
    });
    const state = await owner.query(api.accounts.bootstrap, {});
    expect(state.config.banking.recipientVerified).toBe(false);
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "prepared",
      }),
    ).rejects.toThrow("Verify");
    await owner.mutation(api.accounts.verifySandboxRecipient, {
      accountId,
      last4: "9876",
    });
    const { assessTuition, quoteFingerprint } =
      await import("../convex/tuitionDecision");
    const route = state.paymentRoutes.find(
      (r) => r.key === state.account.selectedRoute,
    )!;
    const comparison = assessTuition({
      amountGBP: state.config.banking.paymentAmount,
      reserveGBP: state.config.security.protectedReserveGBP,
      wallets: state.wallets,
      routes: [route],
      deadline: state.config.banking.tuitionDeadline,
      bufferBusinessDays: 1,
      now: Date.now(),
    }).routes[0];
    const fingerprint = quoteFingerprint(
      1500.25,
      "University of Edinburgh",
      "9876",
      route,
    );
    const proposal = await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "prepared",
      expectedQuote: fingerprint,
    });
    expect(proposal!.totalMinor / 100).toBe(comparison.totalUSD);
    expect(proposal!.recipient).toBe("University of Edinburgh");
    await owner.mutation(api.accounts.transitionPayment, {
      accountId,
      next: "approved",
      proposalId: proposal!._id,
    });
    const approved = await owner.query(api.accounts.bootstrap, {});
    expect(approved.paymentProposals[0].totalMinor).toBe(proposal!.totalMinor);
    await expect(
      owner.mutation(api.accounts.updatePaymentDetails, {
        accountId,
        amount: 100,
        recipient: "Other",
        last4: "1234",
      }),
    ).rejects.toThrow("Reset");
  });
  it("rejects invalid, unauthorized, and changed payment details", async () => {
    const { t, owner, accountId } = await fixture();
    for (const changes of [
      { amount: -1 },
      { amount: 0 },
      { amount: 1.001 },
      { recipient: " " },
      { last4: "abc" },
    ]) {
      await expect(
        owner.mutation(api.accounts.updatePaymentDetails, {
          accountId,
          amount: 100,
          recipient: "University",
          last4: "1234",
          ...changes,
        }),
      ).rejects.toThrow("Invalid");
    }
    await expect(
      t
        .withIdentity({ subject: "outsider|session" })
        .mutation(api.accounts.updatePaymentDetails, {
          accountId,
          amount: 100,
          recipient: "University",
          last4: "1234",
        }),
    ).rejects.toThrow("access denied");
    await owner.mutation(api.accounts.verifySandboxRecipient, {
      accountId,
      last4: "1842",
    });
    await expect(
      owner.mutation(api.accounts.transitionPayment, {
        accountId,
        next: "prepared",
        expectedQuote: "obsolete",
      }),
    ).rejects.toThrow("changed");
  });
  it("deduplicates reminders, derives amounts from saved data and stops after completion", async () => {
    const { t, owner, accountId } = await fixture();
    await owner.mutation(api.accounts.syncPaymentReminder, { accountId });
    await owner.mutation(api.accounts.syncPaymentReminder, { accountId });
    let state = await owner.query(api.accounts.bootstrap, {});
    const reminders = state.notifications.filter((n) =>
      n.title.startsWith("Tuition due "),
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0].detail).toContain("GBP 2000.00");
    await t.run((ctx) =>
      ctx.db.patch(accountId, { paymentStatus: "completed" }),
    );
    await owner.mutation(api.accounts.syncPaymentReminder, { accountId });
    state = await owner.query(api.accounts.bootstrap, {});
    expect(
      state.notifications.filter((n) => n.title.startsWith("Tuition due ")),
    ).toHaveLength(1);
  });
  it("persists move estimates and rejects unrelated owners", async () => {
    const { t, owner, accountId } = await fixture();
    const args = {
      accountId,
      months: 12,
      selectedRoute: 0,
      arrivalDate: "2026-11-01",
      excludedCosts: ["Utilities"],
      budgetAmounts: { "Daily expenses": 300 },
    };
    await owner.mutation(api.accounts.saveMovePlan, args);
    expect(
      (await owner.query(api.accounts.bootstrap, {})).config.move,
    ).toMatchObject({ months: 12, budgetAmounts: { "Daily expenses": 300 } });
    await expect(
      t
        .withIdentity({ subject: "other|session" })
        .mutation(api.accounts.saveMovePlan, args),
    ).rejects.toThrow("access denied");
    await expect(
      owner.mutation(api.accounts.saveMovePlan, {
        ...args,
        budgetAmounts: { rent: -1 },
      }),
    ).rejects.toThrow("Invalid");
  });
});

describe("profile country persistence", () => {
  it("saves country through the existing profile model", async () => {
    const { owner, accountId } = await fixture();
    await owner.mutation(api.accounts.updateProfile, {
      accountId,
      name: "Student",
      countryFrom: "China",
      countryTo: "United Kingdom",
      university: "University of Manchester",
      course: "Computing",
      courseStart: "2026-11-01",
      financialStatus: "Funded",
      sponsorSupport: "None",
      fundingAmount: 5000,
    });
    const reloaded = await owner.query(api.accounts.bootstrap, {});
    expect(reloaded.account.countryFrom).toBe("China");
    expect(reloaded.account.countryTo).toBe("United Kingdom");
  });
});
