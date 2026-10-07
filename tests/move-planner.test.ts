import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { defaultMoveSettings } from "../shared/move-planner";
const modules = import.meta.glob("../convex/**/*.ts");
it("persists the expanded plan for its owner and rejects invalid settings", async () => {
  const t = convexTest(schema, modules);
  const { userId, accountId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "move@example.com" });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "move@example.com",
      name: "Student",
      initials: "S",
      role: "Student",
      planName: "Study",
      countryFrom: "Cambodia",
      countryTo: "United Kingdom",
      university: "University of Manchester",
      course: "Course",
      setupComplete: true,
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
    });
    return { userId, accountId };
  });
  const owner = t.withIdentity({ subject: `${userId}|session` });
  const plan = {
    accountId,
    months: 9,
    selectedRoute: 1,
    arrivalDate: "2027-09-01",
    excludedCosts: ["books"],
    budgetAmounts: { tuition: 20000, rent: 650, food: 15 },
    plannerSettings: {
      ...defaultMoveSettings,
      university: 4,
      depositMonths: 2,
      livingMode: "monthly" as const,
    },
  };
  await owner.mutation(api.accounts.saveMovePlan, plan);
  const saved = await t.run(
    async (ctx) =>
      (
        await ctx.db
          .query("appConfig")
          .withIndex("by_account", (q) => q.eq("accountId", accountId))
          .collect()
      ).find((row) => row.key === "move")!.value,
  );
  expect(saved.plannerSettings).toEqual(plan.plannerSettings);
  expect(saved.budgetAmounts).toEqual(plan.budgetAmounts);
  expect(saved.arrivalDateISO).toBe(plan.arrivalDate);
  await expect(
    owner.mutation(api.accounts.saveMovePlan, {
      ...plan,
      plannerSettings: { ...plan.plannerSettings, contingency: -1 },
    }),
  ).rejects.toThrow("Invalid planner settings");
  await expect(t.mutation(api.accounts.saveMovePlan, plan)).rejects.toThrow();
});
