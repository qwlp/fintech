import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { defaultMoveSettings } from "../shared/move-planner";
const modules = import.meta.glob("../convex/**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules);
  const { userId, accountId, otherUserId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "agent@example.com" });
    const otherUserId = await ctx.db.insert("users", {
      email: "other@example.com",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "agent@example.com",
      name: "Student",
      initials: "S",
      role: "Student",
      planName: "Study",
      countryFrom: "China",
      countryTo: "United Kingdom",
      university: "University of Manchester",
      course: "Course",
      setupComplete: true,
      aiConsentAt: Date.now(),
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
    });
    await ctx.db.insert("appConfig", {
      accountId,
      key: "profile",
      value: {
        fundingAmount: 19000,
        fundingCurrency: "GBP",
        workspaceCurrency: "GBP",
        courseStart: "2027-09",
      },
    });
    await ctx.db.insert("costs", {
      accountId,
      key: "rent",
      name: "Annual rent",
      category: "Recurring",
      amount: 7800,
      due: "Monthly",
    });
    await ctx.db.insert("checklist", {
      accountId,
      key: "documents",
      position: 0,
      label: "Prepare documents",
      detail: "",
      done: false,
    });
    return { userId, accountId, otherUserId };
  });
  const owner = t.withIdentity({ subject: `${userId}|session` });
  const other = t.withIdentity({ subject: `${otherUserId}|session` });
  await owner.mutation(api.accounts.initializePaymentSandbox, { accountId });
  const tool = (name: any, args: Record<string, unknown> = {}) =>
    owner.mutation(internal.accounts.runAgentTool, {
      accountId,
      name,
      arguments: args,
      requestText: "Update my saved plan as requested",
    }) as Promise<any>;
  const state = () => owner.query(api.accounts.bootstrap, {});
  return { t, owner, other, accountId, tool, state };
}

describe("agent workspace editing", () => {
  it("adds and removes destinations without changing the primary financial plan", async () => {
    const { tool, state } = await fixture();
    await tool("update_profile", {
      destinationCountries: ["United Kingdom", "United States"],
    });
    let saved = await state();
    expect(saved.account.countriesTo).toEqual([
      "United Kingdom",
      "United States",
    ]);
    expect(saved.account.countryTo).toBe("United Kingdom");
    expect(saved.costs[0].amount).toBe(7800);
    expect(saved.account.university).toBe("University of Manchester");
    await tool("update_profile", { course: "Mathematics" });
    expect((await state()).account.countriesTo).toEqual([
      "United Kingdom",
      "United States",
    ]);
    await tool("update_profile", { destinationCountries: ["United Kingdom"] });
    saved = await state();
    expect(saved.account.countriesTo).toEqual(["United Kingdom"]);
    await expect(
      tool("update_profile", { destinationCountries: ["United States"] }),
    ).rejects.toThrow("primary");
  });
  it("saves combined university, tuition, payment and planner edits without touching money", async () => {
    const { tool, state } = await fixture();
    const before = await state();
    const result = await tool("update_study_plan", {
      profile: { university: "University of Edinburgh", course: "Finance" },
      annualTuitionFee: 28000,
      payment: { amount: 7000 },
      movePlan: { budgetAmounts: { rent: 950 }, months: 10 },
    });
    expect(result.status).toBe("saved");
    const after = await state();
    expect(after.account).toMatchObject({
      university: "University of Edinburgh",
      course: "Finance",
    });
    expect(after.config.banking).toMatchObject({
      recipient: "University of Edinburgh",
      paymentAmount: 7000,
      recipientVerified: false,
    });
    expect(after.config.move.budgetAmounts).toMatchObject({
      tuition: 28000,
      rent: 950,
    });
    expect(after.config.move.months).toBe(10);
    expect(after.config.move.plannerSettings.university).toBe(5);
    expect(after.costs.find((row) => row.key === "tuition")?.amount).toBe(
      28000,
    );
    expect(after.wallets).toEqual(before.wallets);
    expect(after.ledgerEntries).toEqual(before.ledgerEntries);
  });
  it("rolls back every combined edit when a later field fails validation", async () => {
    const { tool, state } = await fixture();
    const before = await state();
    await expect(
      tool("update_study_plan", {
        profile: { course: "Must roll back" },
        payment: { amount: 500, last4: "oops" },
      }),
    ).rejects.toThrow("Invalid payment details");
    const after = await state();
    expect(after.account).toEqual(before.account);
    expect(after.config).toEqual(before.config);
    expect(after.toolExecutions).toEqual(before.toolExecutions);
  });
  it("changes the study country and university directly using the resulting currency", async () => {
    const { tool, state } = await fixture();
    await tool("update_study_plan", {
      profile: { studyCountry: "United States", university: "UCLA" },
      annualTuitionFee: 45000,
      payment: { amount: 10000, last4: "4321" },
    });
    const saved = await state();
    expect(saved.account.countryTo).toBe("United States");
    expect(saved.config.banking).toMatchObject({
      currency: "USD",
      paymentAmount: 10000,
      recipient: "UCLA",
    });
    expect(saved.config.move.budgetAmounts.tuition).toBe(45000);
    expect(saved.config.move.plannerSettings.university).toBe(8);
  });
  it("edits a planner with an unknown arrival date and tuition planning before Payments is opened", async () => {
    const { t, accountId, tool, state } = await fixture();
    await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("appConfig")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect();
      for (const row of rows)
        if (["banking", "security"].includes(row.key))
          await ctx.db.delete(row._id);
    });
    const before = await state();
    await tool("update_study_plan", {
      annualTuitionFee: 20000,
      tuitionPlan: {
        deadline: new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .slice(0, 10),
        livingReserve: 2500,
      },
      movePlan: { budgetAmounts: { rent: 800 } },
    });
    const after = await state();
    expect(after.config.move.arrivalDateISO).toBe("");
    expect(after.config.move.budgetAmounts).toMatchObject({
      tuition: 20000,
      rent: 800,
    });
    expect(after.config.security.protectedReserveGBP).toBe(2500);
    expect(after.wallets).toEqual(before.wallets);
  });
  it("reads fresh values and approved directory, and saves partial tuition edits with audit evidence", async () => {
    const { tool, state } = await fixture();
    const initial = await state();
    const before = await tool("read_workspace");
    expect(before.approvedDirectory.countries).toHaveLength(3);
    expect(
      Object.values(before.approvedDirectory.universities).flat(),
    ).toHaveLength(9);
    expect(before.confirmedFunding).toBe(19000);
    const result = await tool("update_tuition_details", { amount: 1500.25 });
    expect(result).toMatchObject({
      status: "saved",
      currency: "GBP",
      changes: {
        amount: 1500.25,
        recipient: "University of Manchester",
        last4: "1842",
        recipientConfirmed: false,
      },
    });
    const after = await state();
    expect(after.config.banking).toMatchObject({
      paymentAmount: 1500.25,
      recipientVerified: false,
    });
    expect(after.wallets).toEqual(initial.wallets);
    expect(after.ledgerEntries).toHaveLength(0);
    expect(
      after.toolExecutions.some((row) => row.name === "update_tuition_details"),
    ).toBe(true);
    expect(after.auditEvents.some((row) => row.type === "AGENT_EDIT")).toBe(
      true,
    );
  });
  it("sets deadline/buffer/reserve using existing plan validation and preserves amount", async () => {
    const { tool, state } = await fixture();
    const deadline = new Date(Date.now() + 21 * 86400000)
      .toISOString()
      .slice(0, 10);
    await tool("update_tuition_plan", {
      deadline,
      bufferBusinessDays: 2,
      livingReserve: 1300,
    });
    let saved = await state();
    expect(saved.config.banking).toMatchObject({
      tuitionDeadline: deadline,
      bufferBusinessDays: 2,
      paymentAmount: 2000,
    });
    expect(saved.config.security.protectedReserveGBP).toBe(1300);
    await tool("update_tuition_plan", { livingReserve: 1400 });
    saved = await state();
    expect(saved.config.banking.tuitionDeadline).toBe(deadline);
    expect(saved.config.security.protectedReserveGBP).toBe(1400);
    await expect(
      tool("update_tuition_plan", { deadline: "2030-02-31" }),
    ).rejects.toThrow();
  });
  it("merges Move Planner amounts and settings without erasing other costs", async () => {
    const { owner, accountId, tool, state } = await fixture();
    await owner.mutation(api.accounts.saveMovePlan, {
      accountId,
      months: 9,
      arrivalDate: "2027-09-01",
      selectedRoute: 0,
      excludedCosts: ["books"],
      budgetAmounts: { tuition: 20000, rent: 650, food: 15, books: 100 },
      plannerSettings: { ...defaultMoveSettings, university: 4 },
    });
    await tool("update_move_plan", {
      budgetAmounts: { rent: 900 },
      plannerSettings: { depositMonths: 2 },
    });
    const saved = (await state()).config.move;
    expect(saved).toMatchObject({
      months: 9,
      arrivalDateISO: "2027-09-01",
      excludedCosts: ["books"],
      budgetAmounts: { tuition: 20000, rent: 900, food: 15, books: 100 },
      plannerSettings: { university: 4, depositMonths: 2 },
    });
    await expect(
      tool("update_move_plan", { plannerSettings: { university: 0 } }),
    ).rejects.toThrow("study country");
    await expect(
      tool("update_move_plan", { budgetAmounts: { admin: 1 } }),
    ).rejects.toThrow("Unexpected fields");
    await expect(
      tool("update_move_plan", { plannerSettings: { depositMonths: 1.5 } }),
    ).rejects.toThrow();
    await expect(
      tool("update_move_plan", { excludedCosts: ["unknown"] }),
    ).rejects.toThrow();
  });
  it("edits profile and budget and sets checklist completion idempotently", async () => {
    const { tool, state } = await fixture();
    await tool("update_profile", {
      course: "Computing",
      financialStatus: "Saving",
    });
    await expect(
      tool("update_profile", { courseStart: "2027-13" }),
    ).rejects.toThrow("valid");
    await expect(
      tool("update_profile", { courseStart: "2027-02-30" }),
    ).rejects.toThrow("valid");
    await tool("update_budget_item", { key: "rent", amount: 9000 });
    await tool("update_budget_item", {
      key: "books",
      name: "Books",
      category: "Arrival",
      amount: 300,
      due: "On arrival",
    });
    await tool("set_checklist_item", { key: "documents", done: true });
    await tool("set_checklist_item", { key: "documents", done: true });
    await tool("create_rate_alert", { targetRate: 0.8 });
    await tool("add_country_account", {
      country: "United States",
      label: "Study account",
    });
    const saved = await state();
    expect(saved.account.course).toBe("Computing");
    expect(saved.config.profile).toMatchObject({
      financialStatus: "Saving",
      fundingAmount: 19000,
      courseStart: "2027-09",
    });
    expect(saved.costs.find((row) => row.key === "rent")).toMatchObject({
      name: "Annual rent",
      amount: 9000,
      due: "Monthly",
    });
    expect(saved.costs.find((row) => row.key === "books")?.amount).toBe(300);
    expect(saved.checklist[0].done).toBe(true);
    expect(saved.rateAlerts[0]).toMatchObject({
      pair: "USD/GBP",
      targetRate: 0.8,
    });
    expect(saved.config.profile.countryAccounts).toContainEqual(
      expect.objectContaining({
        country: "United States",
        currency: "USD",
        label: "Study account",
      }),
    );
  });
  it("stages a funding total and requires the owner to confirm once before saving", async () => {
    const { owner, other, tool, state } = await fixture();
    const before = await state();
    const pending = await tool("update_profile", {
      confirmedFunding: 21000,
      course: "Computing",
    });
    expect(pending).toMatchObject({
      status: "pending_confirmation",
      amount: 21000,
      currency: "GBP",
    });
    expect((await state()).config.profile.fundingAmount).toBe(19000);
    expect((await state()).account.course).toBe("Course");
    await expect(
      other.mutation(api.accounts.resolveAgentFundingChange, {
        executionId: pending.executionId,
        confirm: true,
      }),
    ).rejects.toThrow();
    await expect(
      other.query(api.accounts.agentFundingChange, {
        executionId: pending.executionId,
      }),
    ).rejects.toThrow();
    await owner.mutation(api.accounts.resolveAgentFundingChange, {
      executionId: pending.executionId,
      confirm: true,
    });
    const saved = await state();
    expect(saved.config.profile.fundingAmount).toBe(21000);
    expect(saved.account.course).toBe("Computing");
    expect(saved.wallets).toEqual(before.wallets);
    expect(saved.ledgerEntries).toHaveLength(0);
    expect(
      (
        await owner.query(api.accounts.agentFundingChange, {
          executionId: pending.executionId,
        })
      ).status,
    ).toBe("saved");
    await expect(
      owner.mutation(api.accounts.resolveAgentFundingChange, {
        executionId: pending.executionId,
        confirm: true,
      }),
    ).rejects.toThrow("no longer pending");
  });
  it("adds only the confirmed funding delta, and supports cancelling a proposal", async () => {
    const { owner, tool, state } = await fixture();
    const source = {
      key: "scholarship",
      name: "Scholarship",
      type: "Scholarship",
      amount: 1000,
      status: "confirmed",
      available: "Now",
    };
    const pending = await tool("update_funding_source", source);
    expect(pending.amount).toBe(20000);
    expect((await state()).funding).toHaveLength(0);
    await owner.mutation(api.accounts.resolveAgentFundingChange, {
      executionId: pending.executionId,
      confirm: true,
    });
    const repeat = await tool("update_funding_source", {
      key: "scholarship",
      amount: 1000,
    });
    expect(repeat.status).toBe("saved");
    expect((await state()).config.profile.fundingAmount).toBe(20000);
    const change = await tool("update_funding_source", {
      key: "scholarship",
      amount: 1500,
    });
    await owner.mutation(api.accounts.resolveAgentFundingChange, {
      executionId: change.executionId,
      confirm: false,
    });
    expect((await state()).funding[0].amount).toBe(1000);
    expect((await state()).config.profile.fundingAmount).toBe(20000);
  });
  it("rejects stale funding confirmations and consent revocation", async () => {
    const { owner, accountId, tool } = await fixture();
    const pending = await tool("update_profile", { confirmedFunding: 21000 });
    await tool("update_profile", { course: "Edited meanwhile" });
    await expect(
      owner.mutation(api.accounts.resolveAgentFundingChange, {
        executionId: pending.executionId,
        confirm: true,
      }),
    ).rejects.toThrow("changed");
    const next = await tool("update_profile", { confirmedFunding: 21000 });
    await owner.mutation(api.accounts.setAIConsent, {
      accountId,
      enabled: false,
    });
    await expect(
      owner.mutation(api.accounts.resolveAgentFundingChange, {
        executionId: next.executionId,
        confirm: true,
      }),
    ).rejects.toThrow("revoked");
    await expect(
      tool("update_budget_item", { key: "rent", amount: 1 }),
    ).rejects.toThrow("revoked");
    expect(
      await owner.mutation(api.accounts.resolveAgentFundingChange, {
        executionId: next.executionId,
        confirm: false,
      }),
    ).toEqual({ status: "cancelled" });
  });
  it("rejects foreign account arguments, forbidden actions and invalid directory edits", async () => {
    const { t, accountId, tool } = await fixture();
    await expect(
      tool("update_tuition_details", { amount: 1200, accountId: "other" }),
    ).rejects.toThrow("Unexpected fields");
    await expect(
      tool("update_profile", { studyCountry: "Canada" }),
    ).rejects.toThrow("Unsupported");
    await expect(
      tool("update_tuition_details", { recipient: "Peking University" }),
    ).rejects.toThrow("study country");
    await expect(
      tool("update_budget_item", { key: "rent", paid: true }),
    ).rejects.toThrow("Unexpected fields");
    await expect(tool("approve_payment")).rejects.toThrow();
    await expect(
      t.mutation(internal.accounts.runAgentTool, {
        accountId,
        name: "update_tuition_details",
        arguments: { amount: 1000 },
        requestText: "Edit tuition",
      }),
    ).rejects.toThrow("Sign in");
  });
  it("protects approved payment terms from agent edits", async () => {
    const { owner, accountId, tool, state } = await fixture();
    await owner.mutation(api.accounts.verifySandboxRecipient, {
      accountId,
      last4: "1842",
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
    await expect(
      tool("update_tuition_details", { amount: 1000 }),
    ).rejects.toThrow("Reset");
    await expect(
      tool("select_payment_route", { routeKey: "sandbox-fast" }),
    ).rejects.toThrow("Reset");
    await expect(tool("refresh_payment_quotes")).rejects.toThrow("Reset");
    expect((await state()).paymentProposals[0]).toMatchObject({
      status: "approved",
      amountMinor: 200000,
    });
    expect((await state()).ledgerEntries).toHaveLength(0);
  });
});
