import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { requireAccount } from "./ownership";
import { convertMoney, studyCurrency } from "../shared/currency";
import {
  validateStudySelection,
  destinationCountries,
  validateDestinations,
  countries,
  universities,
} from "../shared/study";
import {
  defaultMoveSettings,
  moveFields,
  calculateMove,
  validateMoveSettings,
} from "../shared/move-planner";
import profiles from "../shared/move-planner-data.json";
import { validateWorkspaceTool } from "../shared/agent-tools";

const fundingTotal = (state: any): number =>
  typeof state.config.profile?.fundingAmount === "number"
    ? state.config.profile.fundingAmount
    : state.funding
        .filter((row: any) => row.status === "confirmed")
        .reduce((sum: number, row: any) => sum + row.amount, 0);
const amount = (value: number, currency: string) => {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > convertMoney(1000000, "GBP", currency) ||
    !Number.isSafeInteger(Math.round(value * 100))
  )
    throw new Error("Invalid money amount in study currency");
  return Math.round(value * 100) / 100;
};
function profilePatch(state: any, args: any) {
  const account = state.account,
    profile = state.config.profile ?? {};
  const countryTo = args.studyCountry ?? account.countryTo;
  const currency = studyCurrency(countryTo);
  const patch = {
    accountId: account._id,
    name: args.name ?? account.name,
    countryFrom: args.homeCountry ?? account.countryFrom,
    countryTo,
    countriesTo: validateDestinations(
      countryTo,
      args.destinationCountries ?? destinationCountries({ ...account, countryTo }),
    ),
    university:
      args.university ??
      (countryTo === account.countryTo ? account.university : ""),
    course: args.course ?? account.course,
    courseStart: args.courseStart ?? profile.courseStart ?? "",
    financialStatus: args.financialStatus ?? profile.financialStatus ?? "",
    sponsorSupport: args.sponsorSupport ?? profile.sponsorSupport ?? "",
    fundingAmount: amount(
      args.confirmedFunding ??
        convertMoney(
          fundingTotal(state),
          studyCurrency(account.countryTo),
          currency,
        ),
      currency,
    ),
  };
  validateStudySelection(patch.countryFrom, patch.countryTo, patch.university);
  if (patch.courseStart) {
    const date =
      patch.courseStart.length === 7
        ? `${patch.courseStart}-01`
        : patch.courseStart;
    if (
      !/^\d{4}-\d{2}(?:-\d{2})?$/.test(patch.courseStart) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      throw new Error("Use a valid YYYY-MM or YYYY-MM-DD for course start");
  }
  return patch;
}
function fundingPatch(state: any, args: any) {
  const previous = state.funding.find((row: any) => row.key === args.key);
  const merged = { ...previous, ...args };
  for (const key of ["name", "type", "amount", "status", "available"])
    if (merged[key] === undefined)
      throw new Error(`New funding sources require ${key}`);
  const currency = studyCurrency(state.account.countryTo);
  const nextAmount = amount(merged.amount, currency);
  const delta =
    (merged.status === "confirmed" ? nextAmount : 0) -
    (previous?.status === "confirmed" ? previous.amount : 0);
  return {
    previous,
    record: {
      key: args.key,
      name: merged.name,
      type: merged.type,
      amount: nextAmount,
      status: merged.status,
      available: merged.available,
    },
    total: amount(fundingTotal(state) + delta, currency),
    delta,
  };
}
function changeVersion(state: any, name: string, args: any) {
  if (name === "update_profile")
    return JSON.stringify({
      name: state.account.name,
      countryFrom: state.account.countryFrom,
      countryTo: state.account.countryTo,
      countriesTo: destinationCountries(state.account),
      university: state.account.university,
      course: state.account.course,
      profile: state.config.profile ?? {},
    });
  return JSON.stringify({
    currency: studyCurrency(state.account.countryTo),
    fundingAmount: fundingTotal(state),
    source: state.funding.find((row: any) => row.key === args.key) ?? null,
  });
}
async function record(
  ctx: MutationCtx,
  accountId: Id<"accounts">,
  name: string,
  args: any,
  result: any,
) {
  await ctx.db.insert("toolExecutions", {
    accountId,
    name,
    arguments: args,
    result,
    timestamp: Date.now(),
  });
  await ctx.db.insert("auditEvents", {
    accountId,
    type: "AGENT_EDIT",
    detail: `${name}: requested changes saved`,
    actor: "MoveWire",
    timestamp: Date.now(),
  });
  return result;
}
export async function runWorkspaceTool(
  ctx: MutationCtx,
  accountId: Id<"accounts">,
  name: string,
  args: Record<string, any>,
  confirmed = false,
): Promise<any> {
  validateWorkspaceTool(name, args);
  const account = await requireAccount(ctx, accountId);
  if (account.role !== "Student") throw new Error("Student account required");
  if (!account.aiConsentAt)
    throw new Error("AI processing consent has been revoked");
  let state: any = await ctx.runQuery(api.accounts.bootstrap, {});
  const currency = studyCurrency(account.countryTo);
  if (name === "read_workspace")
    return {
      status: "read",
      currency,
      profile: {
        name: account.name,
        homeCountry: account.countryFrom,
        studyCountry: account.countryTo,
        destinationCountries: destinationCountries(account),
        university: account.university,
        course: account.course,
        ...state.config.profile,
      },
      tuition: state.config.banking ?? {},
      livingReserve: state.config.security?.protectedReserveGBP ?? null,
      movePlan: state.config.move ?? {},
      costs: state.costs,
      funding: state.funding,
      confirmedFunding: fundingTotal(state),
      routes: state.paymentRoutes,
      selectedRoute: account.selectedRoute,
      paymentStatus: account.paymentStatus,
      checklist: state.checklist,
      alerts: state.rateAlerts,
      approvedDirectory: {
        countries,
        universities,
        universityEstimates: profiles.map((p) => ({
          id: p.id,
          university: p.name,
          country: p.country,
        })),
      },
    };
  if (name === "update_study_plan") {
    const changes: Record<string, any> = {};
    if (args.profile) {
      changes.profile = await runWorkspaceTool(
        ctx,
        accountId,
        "update_profile",
        args.profile,
      );
      if (changes.profile.status !== "saved")
        throw new Error(
          "Save the study-country funding conversion using update_profile and confirm it before making combined edits",
        );
    }
    state = await ctx.runQuery(api.accounts.bootstrap, {});
    const university = args.profile?.university;
    if (args.payment) {
      changes.payment = await runWorkspaceTool(
        ctx,
        accountId,
        "update_tuition_details",
        {
          ...(university ? { recipient: university } : {}),
          ...args.payment,
        },
      );
    } else if (university && state.config.banking) {
      if (state.account.paymentStatus !== "not_started")
        throw new Error(
          "Reset the active payment before changing its university",
        );
      const row = (
        await ctx.db
          .query("appConfig")
          .withIndex("by_account", (q) => q.eq("accountId", accountId))
          .take(100)
      ).find((row) => row.key === "banking");
      if (row)
        await ctx.db.patch(row._id, {
          value: {
            ...row.value,
            recipient: university,
            recipientVerified: false,
          },
        });
      changes.payment = {
        status: "saved",
        recipient: university,
        recipientConfirmed: false,
      };
    }
    if (args.tuitionPlan)
      changes.tuitionPlan = await runWorkspaceTool(
        ctx,
        accountId,
        "update_tuition_plan",
        args.tuitionPlan,
      );
    if (args.movePlan || args.annualTuitionFee !== undefined || university) {
      const universityIndex =
        universities[state.account.countryTo]?.indexOf(university);
      // Estimate profiles follow the same country and university ordering as the approved directory.
      const countryProfiles = profiles.filter(
        (p) => p.country === state.account.countryTo,
      );
      const estimate =
        universityIndex >= 0 ? countryProfiles[universityIndex] : undefined;
      changes.movePlan = await runWorkspaceTool(
        ctx,
        accountId,
        "update_move_plan",
        {
          ...args.movePlan,
          ...(university
            ? {
                plannerSettings: {
                  ...(args.movePlan?.plannerSettings ?? {}),
                  university: estimate?.id ?? -1,
                },
              }
            : {}),
          ...(args.movePlan?.budgetAmounts ||
          args.annualTuitionFee !== undefined
            ? {
                budgetAmounts: {
                  ...args.movePlan?.budgetAmounts,
                  ...(args.annualTuitionFee !== undefined
                    ? { tuition: args.annualTuitionFee }
                    : {}),
                },
              }
            : {}),
        },
      );
    }
    if (args.routeKey)
      changes.route = await runWorkspaceTool(
        ctx,
        accountId,
        "select_payment_route",
        { routeKey: args.routeKey },
      );
    return record(ctx, accountId, name, args, {
      status: "saved",
      currency: studyCurrency(state.account.countryTo),
      changes,
    });
  }
  // Editing payment configuration must work before the Payments page is opened.
  // Create only planning configuration, without initializing or crediting wallets.
  if (
    ["update_tuition_details", "update_tuition_plan"].includes(name) &&
    !state.config.banking
  ) {
    const banking = {
      currency,
      recipient: account.university,
      recipientAccountLast4: "",
      paymentAmount: 0,
      recipientVerified: false,
      sandbox: true,
      bufferBusinessDays: 1,
    };
    await ctx.db.insert("appConfig", {
      accountId,
      key: "banking",
      value: banking,
    });
    state.config.banking = banking;
  }
  if (name === "update_tuition_plan" && !state.config.security) {
    const security = { currency, protectedReserveGBP: 0 };
    await ctx.db.insert("appConfig", {
      accountId,
      key: "security",
      value: security,
    });
    state.config.security = security;
  }
  const profile = name === "update_profile" ? profilePatch(state, args) : null;
  const funding =
    name === "update_funding_source" ? fundingPatch(state, args) : null;
  if (funding && !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(args.key))
    throw new Error("Use a simple stable funding key");
  const fundingChange =
    (!!profile && args.confirmedFunding !== undefined) ||
    (!!funding && funding.delta !== 0);
  if (fundingChange && !confirmed) {
    const result: any = {
      status: "pending_confirmation",
      name,
      amount: profile?.fundingAmount ?? funding!.total,
      currency: profile ? studyCurrency(profile.countryTo) : currency,
      expiresAt: Date.now() + 30 * 60_000,
      version: changeVersion(state, name, args),
      nextStep:
        "Confirm the displayed total funding amount in the chat card. Nothing has been saved yet.",
    };
    const executionId = await ctx.db.insert("toolExecutions", {
      accountId,
      name,
      arguments: args,
      result,
      timestamp: Date.now(),
    });
    result.executionId = executionId;
    await ctx.db.patch(executionId, { result });
    return result;
  }
  let changes: any;
  if (name === "update_profile") {
    await ctx.runMutation(api.accounts.updateProfile, profile!);
    changes = { ...profile, accountId: undefined };
    delete changes.accountId;
  } else if (name === "update_funding_source") {
    if (funding!.previous)
      await ctx.db.patch(funding!.previous._id, funding!.record);
    else await ctx.db.insert("funding", { accountId, ...funding!.record });
    const row = await ctx.db
      .query("appConfig")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .filter((q) => q.eq(q.field("key"), "profile"))
      .first();
    const value = {
      ...(row?.value ?? {}),
      fundingAmount: funding!.total,
      fundingCurrency: currency,
    };
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("appConfig", { accountId, key: "profile", value });
    changes = { source: funding!.record, confirmedFunding: funding!.total };
  } else if (name === "update_tuition_details") {
    const banking = state.config.banking;
    if (!banking) throw new Error("Open Payments to initialize tuition first");
    const patch = {
      accountId,
      amount: args.amount ?? banking.paymentAmount,
      recipient: args.recipient ?? banking.recipient,
      last4: args.last4 ?? banking.recipientAccountLast4,
    };
    if (!patch.recipient)
      throw new Error("Choose your university to save payment details");
    if (!(patch.amount > 0))
      throw new Error("Provide a positive tuition payment amount");
    await ctx.runMutation(api.accounts.updatePaymentDetails, patch);
    changes = {
      amount: patch.amount,
      recipient: patch.recipient,
      last4: patch.last4,
      recipientConfirmed: false,
    };
  } else if (name === "update_tuition_plan") {
    const banking = state.config.banking,
      security = state.config.security;
    if (!banking || !security)
      throw new Error("Open Payments to initialize tuition first");
    const patch = {
      accountId,
      deadline: args.deadline ?? banking.tuitionDeadline,
      bufferBusinessDays:
        args.bufferBusinessDays ?? banking.bufferBusinessDays ?? 1,
      protectedReserveGBP:
        args.livingReserve ?? security.protectedReserveGBP ?? 0,
    };
    if (!patch.deadline)
      throw new Error("Provide a tuition deadline (YYYY-MM-DD)");
    await ctx.runMutation(api.accounts.updateTuitionPlan, patch);
    changes = {
      deadline: patch.deadline,
      bufferBusinessDays: patch.bufferBusinessDays,
      livingReserve: patch.protectedReserveGBP,
    };
  } else if (name === "update_move_plan") {
    const move = state.config.move ?? {};
    const settings = {
      ...defaultMoveSettings,
      ...move.plannerSettings,
      ...args.plannerSettings,
    };
    if (settings.university !== move.plannerSettings?.university) delete settings.courseId;
    validateMoveSettings(settings);
    if (
      settings.university >= 0 &&
      profiles[settings.university]?.country !== account.countryTo
    )
      throw new Error("Choose university estimates in the saved study country");
    const budgetAmounts = {
      ...(move.budgetAmounts ?? {}),
      ...(args.budgetAmounts ?? {}),
    };
    for (const [key, value] of Object.entries(budgetAmounts)) {
      if (!moveFields.includes(key as any))
        throw new Error("Unknown Move Planner cost");
      amount(value as number, currency);
    }
    const patch = {
      accountId,
      months: args.months ?? move.months ?? 12,
      selectedRoute: args.selectedRoute ?? move.selectedRoute ?? 0,
      arrivalDate: args.arrivalDate ?? move.arrivalDateISO ?? "",
      excludedCosts: args.excludedCosts ?? move.excludedCosts ?? [],
      budgetAmounts,
      plannerSettings: settings,
    };
    await ctx.runMutation(api.accounts.saveMovePlan, patch);
    changes = {
      months: patch.months,
      arrivalDate: patch.arrivalDate,
      budgetAmounts,
      plannerSettings: settings,
      excludedCosts: patch.excludedCosts,
      totals: calculateMove(
        budgetAmounts,
        patch.months,
        settings,
        patch.excludedCosts,
      ),
    };
  } else if (name === "update_budget_item") {
    if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(args.key))
      throw new Error("Use a simple stable budget key");
    const previous = state.costs.find((row: any) => row.key === args.key);
    const merged = { ...previous, ...args };
    for (const key of ["name", "category", "amount", "due"])
      if (merged[key] === undefined)
        throw new Error(`New budget items require ${key}`);
    const item = {
      key: args.key,
      name: merged.name,
      category: merged.category,
      amount: amount(merged.amount, currency),
      due: merged.due,
    };
    if (previous) await ctx.db.patch(previous._id, item);
    else await ctx.db.insert("costs", { accountId, ...item });
    changes = item;
  } else if (name === "select_payment_route") {
    await ctx.runMutation(api.accounts.setRoute, {
      accountId,
      route: args.routeKey,
    });
    changes = { selectedRoute: args.routeKey };
  } else if (name === "refresh_payment_quotes") {
    await ctx.runMutation(api.accounts.refreshSandboxQuotes, { accountId });
    changes = { quotesRefreshed: true, sandbox: true };
  } else if (name === "set_checklist_item") {
    const item = state.checklist.find((row: any) => row.key === args.key);
    if (!item) throw new Error("Checklist item not found");
    await ctx.db.patch(item._id, { done: args.done });
    changes = { key: args.key, done: args.done };
  } else if (name === "create_rate_alert") {
    const pair = `USD/${currency}`;
    await ctx.runMutation(api.accounts.createRateAlert, {
      accountId,
      pair,
      targetRate: args.targetRate,
    });
    changes = { pair, targetRate: args.targetRate };
  } else if (name === "add_country_account") {
    await ctx.runMutation(api.accounts.addCountryAccount, {
      accountId,
      country: args.country,
      label: args.label,
    });
    changes = { country: args.country, label: args.label };
  } else throw new Error("Tool is not permitted");
  return record(ctx, accountId, name, args, {
    status: "saved",
    currency: profile ? studyCurrency(profile.countryTo) : currency,
    changes,
  });
}

export async function resolveFundingChange(
  ctx: MutationCtx,
  executionId: Id<"toolExecutions">,
  confirm: boolean,
) {
  const row = await ctx.db.get(executionId);
  if (!row) throw new Error("Funding change not found");
  const account = await requireAccount(ctx, row.accountId);
  if (
    !["update_profile", "update_funding_source"].includes(row.name) ||
    row.result?.status !== "pending_confirmation"
  )
    throw new Error("Funding change is no longer pending");
  if (!confirm) {
    await ctx.db.patch(row._id, {
      result: { ...row.result, status: "cancelled" },
    });
    return { status: "cancelled" };
  }
  if (!account.aiConsentAt)
    throw new Error("AI processing consent has been revoked");
  if (row.result.expiresAt < Date.now())
    throw new Error("Funding change expired. Ask the agent to create it again");
  const state = await ctx.runQuery(api.accounts.bootstrap, {});
  if (changeVersion(state, row.name, row.arguments) !== row.result.version)
    throw new Error(
      "Your funding or profile changed. Ask the agent to refresh this change",
    );
  const result = await runWorkspaceTool(
    ctx,
    row.accountId,
    row.name,
    row.arguments,
    true,
  );
  await ctx.db.patch(row._id, { result: { ...row.result, ...result } });
  return result;
}
