import { courseUniversities, validateCourseSelection } from "./courses";

export const moveFields = [
  "flight",
  "visa",
  "holdFund",
  "health",
  "medical",
  "biometrics",
  "tuition",
  "rent",
  "insurance",
  "books",
  "settling",
  "food",
  "transport",
  "phone",
  "laundry",
  "personal",
  "social",
  "monthlyLiving",
] as const;
export type MoveField = (typeof moveFields)[number];
export type MoveSettings = {
  university: number;
  courseId?: string;
  housing: number;
  flightOption: number;
  insuranceOption: number;
  lifestyle: number;
  depositMonths: number;
  contingency: number;
  livingMode: "daily" | "monthly";
  fundingOption: number;
  proofOption: number;
};
export const defaultMoveSettings: MoveSettings = {
  university: -1,
  housing: 0,
  flightOption: 0,
  insuranceOption: 0,
  lifestyle: 0,
  depositMonths: 1,
  contingency: 10,
  livingMode: "daily",
  fundingOption: 0,
  proofOption: 0,
};
export function validateMoveSettings(value: MoveSettings) {
  if (
    !value ||
    !["daily", "monthly"].includes(value.livingMode) ||
    !Number.isInteger(value.university) ||
    value.university < -1 ||
    value.university > 8 ||
    ![1, 2].includes(value.depositMonths) ||
    !Number.isFinite(value.contingency) ||
    value.contingency < 0 ||
    value.contingency > 100 ||
    [
      value.housing,
      value.flightOption,
      value.insuranceOption,
      value.lifestyle,
      value.fundingOption,
      value.proofOption,
    ].some((n) => !Number.isInteger(n) || n < 0 || n > 10)
  )
    throw new Error("Invalid planner settings");
  if (value.courseId) {
    validateCourseSelection(
      courseUniversities[value.university] ?? "",
      value.courseId,
    );
  }
}
export function calculateMove(
  amounts: Partial<Record<MoveField, number>>,
  months: number,
  settings: MoveSettings,
  excluded: string[] = [],
) {
  const n = (key: MoveField) =>
    excluded.includes(key)
      ? 0
      : Math.max(0, Number.isFinite(amounts[key]) ? amounts[key]! : 0);
  const visaPackage =
    n("visa") + n("holdFund") + n("health") + n("medical") + n("biometrics");
  const daily =
    n("food") +
    n("transport") +
    n("phone") +
    n("laundry") +
    n("personal") +
    n("social");
  const monthly =
    settings.livingMode === "daily" ? daily * 30 : n("monthlyLiving");
  const deposit = n("rent") * settings.depositMonths;
  const breakdown = [
    { name: "Flights", amount: n("flight") },
    { name: "Visa package", amount: visaPackage },
    { name: "Tuition", amount: n("tuition") },
    { name: "Accommodation", amount: deposit + n("rent") * months },
    { name: "Insurance", amount: n("insurance") },
    { name: "Books & equipment", amount: n("books") },
    { name: "Settling in", amount: n("settling") },
    { name: "Living expenses", amount: monthly * months },
  ];
  const subtotal = breakdown.reduce((sum, row) => sum + row.amount, 0);
  const contingency = (subtotal * settings.contingency) / 100;
  return {
    daily,
    monthly,
    deposit,
    visaPackage,
    subtotal,
    contingency,
    total: subtotal + contingency,
    arrival:
      n("flight") + visaPackage + n("rent") + deposit + n("settling") + monthly,
    breakdown: [...breakdown, { name: "Contingency", amount: contingency }],
  };
}

/** Carry existing editable budgets forward when opening the expanded planner. */
export function migrateMoveAmounts(
  config: any,
  currency: string,
  convert: (amount: number, from: string, to: string) => number,
) {
  const result: Partial<Record<MoveField, number>> = {};
  const mapping: Record<string, MoveField> = {
    "Visa & health surcharge": "visa",
    Flight: "flight",
    Tuition: "tuition",
    "First month rent + deposit": "rent",
    "Rent deposit": "rent",
    "Daily expenses": "monthlyLiving",
    Utilities: "monthlyLiving",
  };
  for (const [name, , text] of config?.requirements ?? []) {
    const key = mapping[name];
    if (!key || config?.excludedCosts?.includes(name)) continue;
    let value =
      config?.budgetAmounts?.[name] ??
      convert(
        Number(
          String(text)
            .match(/[\d,]+(?:\.\d+)?/)?.[0]
            .replaceAll(",", "") ?? 0,
        ),
        config?.fixtureCurrency ?? "GBP",
        currency,
      );
    if (key === "rent" && name === "First month rent + deposit") value /= 2;
    if (key === "flight" && config?.routes?.length) {
      const route = config.routes[config.selectedRoute ?? 1];
      if (route)
        value = convert(
          Number(
            String(route[3])
              .match(/[\d,]+(?:\.\d+)?/)?.[0]
              .replaceAll(",", "") ?? value,
          ),
          config?.fixtureCurrency ?? "GBP",
          currency,
        );
    }
    result[key] = (result[key] ?? 0) + value;
  }
  return result;
}
