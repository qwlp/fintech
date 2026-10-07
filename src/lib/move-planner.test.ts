import { describe, it, expect } from "vitest";
import {
  calculateMove,
  defaultMoveSettings,
  validateMoveSettings,
} from "../../shared/move-planner";
import profiles from "../../shared/move-planner-data.json";
describe("move planning", () => {
  const amounts = {
    flight: 500,
    visa: 100,
    holdFund: 200,
    health: 300,
    medical: 40,
    biometrics: 20,
    tuition: 6000,
    rent: 1000,
    insurance: 800,
    books: 100,
    settling: 250,
    food: 10,
    transport: 2,
    phone: 1,
    laundry: 1,
    personal: 3,
    social: 3,
  };
  it("calculates first-year and sponsor arrival totals independently", () => {
    const result = calculateMove(amounts, 9, defaultMoveSettings);
    expect(result.visaPackage).toBe(660);
    expect(result.monthly).toBe(600);
    expect(result.subtotal).toBe(23710);
    expect(result.total).toBe(26081);
    expect(result.arrival).toBe(4010);
  });
  it("uses monthly living instead of also charging daily costs", () => {
    const result = calculateMove({ ...amounts, monthlyLiving: 400 }, 9, {
      ...defaultMoveSettings,
      livingMode: "monthly",
      depositMonths: 2,
      contingency: 0,
    });
    expect(result.monthly).toBe(400);
    expect(result.deposit).toBe(2000);
    expect(result.total).toBe(22910);
  });
  it("excludes costs from the annual and arrival calculations", () => {
    const result = calculateMove(amounts, 9, defaultMoveSettings, [
      "rent",
      "holdFund",
      "food",
    ]);
    expect(result.deposit).toBe(0);
    expect(result.visaPackage).toBe(460);
    expect(result.monthly).toBe(300);
    expect(result.arrival).toBe(1510);
  });
  it("rejects invalid persisted settings", () => {
    expect(() =>
      validateMoveSettings({ ...defaultMoveSettings, contingency: NaN }),
    ).toThrow();
    expect(() =>
      validateMoveSettings({ ...defaultMoveSettings, housing: -1 }),
    ).toThrow();
    expect(() => validateMoveSettings(defaultMoveSettings)).not.toThrow();
  });
  it("includes all nine universities and six alternatives groups", () => {
    expect(profiles).toHaveLength(9);
    for (const p of profiles)
      expect(Object.keys(p.alternatives)).toHaveLength(6);
  });
});

it("carries old edited costs and monthly living forward", async () => {
  const { migrateMoveAmounts } = await import("../../shared/move-planner");
  const { convertMoney } = await import("../../shared/currency");
  const result = migrateMoveAmounts(
    {
      requirements: [
        ["Visa & health surcharge", "", "£1600"],
        ["Daily expenses", "", "£425 / mo"],
        ["Utilities", "", "£145 / mo"],
      ],
      budgetAmounts: { "Visa & health surcharge": 1800 },
    },
    "GBP",
    convertMoney,
  );
  expect(result).toEqual({ visa: 1800, monthlyLiving: 570 });
});
