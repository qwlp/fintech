import { moveFields } from "./move-planner";
import { countries, universities } from "./study";

type Schema = {
  type: "object" | "string" | "number" | "boolean" | "array";
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minProperties?: number;
  maxItems?: number;
};
const string = (maxLength = 160): Schema => ({ type: "string", maxLength });
const number = (minimum = 0, maximum = 1e9): Schema => ({
  type: "number",
  minimum,
  maximum,
});
const choice = (values: string[]): Schema => ({ type: "string", enum: values });
const object = (
  properties: Record<string, Schema>,
  required: string[] = [],
  minProperties = 1,
): Schema => ({
  type: "object",
  properties,
  required,
  minProperties,
  additionalProperties: false,
});
const settings = object({
  university: number(-1, 8),
  housing: number(0, 10),
  flightOption: number(0, 10),
  insuranceOption: number(0, 10),
  lifestyle: number(0, 10),
  depositMonths: { type: "number", enum: [1, 2] },
  contingency: number(0, 100),
  livingMode: choice(["daily", "monthly"]),
  fundingOption: number(0, 10),
  proofOption: number(0, 10),
});
const baseWorkspaceTools = {
  read_workspace: {
    description:
      "Read current profile, tuition details and plan, Move Planner, budget items, funding sources, route keys, checklist and alerts before editing. Returns approved countries/universities. No records changed.",
    parameters: object({}, [], 0),
  },
  update_tuition_details: {
    description:
      "Save requested tuition amount, listed university recipient or account last four digits. Partial update preserves omitted fields. Amount is in study currency. Clears recipient confirmation; cannot edit an active proposal.",
    parameters: object({
      amount: number(0.01),
      recipient: choice(Object.values(universities).flat()),
      last4: { ...string(4), minLength: 4 },
    }),
  },
  update_tuition_plan: {
    description:
      "Save requested tuition deadline (YYYY-MM-DD), business-day safety buffer or living reserve in study currency. Preserve omitted fields; ask for deadline if none is saved. Cannot edit an active proposal.",
    parameters: object({
      deadline: string(10),
      bufferBusinessDays: number(0, 5),
      livingReserve: number(),
    }),
  },
  update_move_plan: {
    description:
      "Save requested Move Planner costs and settings. Partial budgetAmounts/settings merge into saved values. Costs use study currency; rent is monthly, food/transport/phone/laundry/personal/social are daily, tuition is annual. months 1–24. Read workspace for university IDs; use only IDs in the study country. arrivalDate (YYYY-MM-DD) may be omitted or cleared when unknown. excludedCosts replaces exclusions when supplied.",
    parameters: object({
      months: number(1, 24),
      arrivalDate: string(10),
      selectedRoute: number(0, 50),
      budgetAmounts: object(
        Object.fromEntries(moveFields.map((key) => [key, number()])),
      ),
      plannerSettings: settings,
      excludedCosts: {
        type: "array",
        maxItems: moveFields.length,
        items: choice([...moveFields]),
      },
    }),
  },
  update_profile: {
    description:
      "Save requested profile fields, preserving omitted values. Only listed countries/universities. confirmedFunding sets the TOTAL declared study-plan funding, not a wallet balance. Explicit confirmedFunding changes return a pending confirmation card; they are NOT saved until the owner confirms in chat. Requested study-country changes save directly with currency rebasing. Changing study country clears university unless provided and rebases plan amounts. destinationCountries replaces the saved destination list and must include studyCountry (the primary destination). Adding destinations alone preserves the active financial plan.",
    parameters: object({
      name: { ...string(100), minLength: 1 },
      homeCountry: choice(countries.map((c) => c.name)),
      studyCountry: choice(countries.map((c) => c.name)),
      destinationCountries: {
        type: "array",
        maxItems: countries.length,
        items: choice(countries.map((c) => c.name)),
      },
      university: choice(["", ...Object.values(universities).flat()]),
      course: string(100),
      courseStart: string(10),
      financialStatus: string(),
      sponsorSupport: string(),
      confirmedFunding: number(),
    }),
  },
  update_budget_item: {
    description:
      "Create or update an item in the study-plan budget by its stable key. amount is the full budget-period amount in study currency (not daily/monthly Move Planner costs). New items require name, category, amount and due. Never mark tuition paid; payment receipts determine actual payments.",
    parameters: object(
      {
        key: { ...string(80), minLength: 1 },
        name: { ...string(120), minLength: 1 },
        category: choice(["Pre-departure", "Arrival", "Recurring", "Safety"]),
        amount: number(),
        due: string(100),
      },
      ["key"],
    ),
  },
  update_funding_source: {
    description:
      "Create or update an itemized source by key. New items require name, type, amount, status, available. Amount uses study currency. Confirmed amounts adjust declared TOTAL funding by the source delta; use update_profile to set the total directly. Confirmed-funding changes require the owner's amount-confirmation card. Does not credit wallets or move funds.",
    parameters: object(
      {
        key: { ...string(80), minLength: 1 },
        name: { ...string(120), minLength: 1 },
        type: choice(["Savings", "Sponsor", "Scholarship"]),
        amount: number(),
        status: choice(["confirmed", "pending"]),
        available: string(100),
      },
      ["key"],
    ),
  },
  select_payment_route: {
    description:
      "Select the user's explicitly requested existing route by key. Read comparison first. Never silently select a recommendation. Cannot change an active payment.",
    parameters: object({ routeKey: string(80) }, ["routeKey"]),
  },
  refresh_payment_quotes: {
    description:
      "Refresh illustrative sandbox tuition quotes when requested; no live provider data. Cannot change an active proposal.",
    parameters: object({}, [], 0),
  },
  set_checklist_item: {
    description:
      "Set an existing departure checklist item done/undone as requested. Idempotent, never implies bank or university verification.",
    parameters: object({ key: string(80), done: { type: "boolean" } }, [
      "key",
      "done",
    ]),
  },
  create_rate_alert: {
    description:
      "Save a local rate alert for USD to the study currency. targetRate is study currency per USD. No message is sent to another person.",
    parameters: object({ targetRate: number(0.000001) }, ["targetRate"]),
  },
  add_country_account: {
    description:
      "Add a labelled country account to Profile from the approved list. This is planning metadata; no real account is opened and no funds are credited.",
    parameters: object(
      {
        country: choice(countries.map((c) => c.name)),
        label: { ...string(100), minLength: 1 },
      },
      ["country", "label"],
    ),
  },
} satisfies Record<string, { description: string; parameters: Schema }>;
// One atomic tool can apply edits across pages without exhausting the model's tool loop.
const { confirmedFunding: _funding, ...editableProfile } =
  baseWorkspaceTools.update_profile.parameters.properties!;
export const workspaceTools = {
  ...baseWorkspaceTools,
  update_study_plan: {
    description:
      "Save all explicitly requested profile, university, annual tuition fee, payment details/plan, route and Move Planner edits together atomically. Preserves omitted fields. university in profile also updates the payment recipient and saved planner university. annualTuitionFee updates annual tuition in Move Planner and budget; payment.amount is the separate amount to pay. Monetary values use the resulting study country's currency. Does not approve/send payments or change funding/wallets. On failure no edits are saved.",
    parameters: object({
      profile: object(editableProfile),
      annualTuitionFee: number(),
      payment: baseWorkspaceTools.update_tuition_details.parameters,
      tuitionPlan: baseWorkspaceTools.update_tuition_plan.parameters,
      movePlan: baseWorkspaceTools.update_move_plan.parameters,
      routeKey: string(80),
    }),
  },
} satisfies Record<string, { description: string; parameters: Schema }>;
export type WorkspaceTool = keyof typeof workspaceTools;
export const isWorkspaceTool = (name: string): name is WorkspaceTool =>
  Object.hasOwn(workspaceTools, name);
export const workspaceToolDefinitions = Object.entries(workspaceTools).map(
  ([name, definition]) => ({
    type: "function",
    function: { name, ...definition },
  }),
);

export function validateWorkspaceTool(name: string, args: unknown) {
  if (!isWorkspaceTool(name)) throw new Error("Tool is not permitted");
  function check(value: any, schema: Schema, path: string) {
    if (schema.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error(`Invalid ${path}`);
      const keys = Object.keys(value);
      if (keys.length < (schema.minProperties ?? 0))
        throw new Error(`Provide fields for ${path}`);
      if (keys.some((key) => !Object.hasOwn(schema.properties ?? {}, key)))
        throw new Error(`Unexpected fields in ${path}`);
      if (schema.required?.some((key) => !Object.hasOwn(value, key)))
        throw new Error(`Missing required fields in ${path}`);
      for (const key of keys)
        check(value[key], schema.properties![key], `${path}.${key}`);
    } else if (schema.type === "array") {
      if (!Array.isArray(value) || value.length > (schema.maxItems ?? 100))
        throw new Error(`Invalid ${path}`);
      value.forEach((item) => check(item, schema.items!, path));
    } else {
      if (typeof value !== schema.type) throw new Error(`Invalid ${path}`);
      if (schema.enum && !schema.enum.includes(value))
        throw new Error(`Unsupported ${path}`);
      if (
        schema.type === "number" &&
        (!Number.isFinite(value) ||
          value < (schema.minimum ?? -Infinity) ||
          value > (schema.maximum ?? Infinity))
      )
        throw new Error(`Invalid ${path}`);
      if (
        schema.type === "string" &&
        (value.trim().length < (schema.minLength ?? 0) ||
          value.length > (schema.maxLength ?? 1000))
      )
        throw new Error(`Invalid ${path}`);
    }
  }
  check(args, workspaceTools[name].parameters, name);
}
