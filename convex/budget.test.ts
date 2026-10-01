// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(api.accounts.seedDemo, {});
  return t;
}

describe("wallet budget", () => {
  test("saves category amounts, normalizes names, and leaves bills and balances intact", async () => {
    const t = await setup();
    const before = await t.query(api.accounts.bootstrap, {
      email: "dara@financialpassport.demo",
    });
    await t.mutation(api.accounts.saveBudget, {
      allocations: [
        { category: " Housing ", amount: 1300.257 },
        { category: "Groceries", amount: 250 },
      ],
    });
    const after = await t.query(api.accounts.bootstrap, {
      email: "dara@financialpassport.demo",
    });
    expect(after?.config.budget).toEqual({
      currency: "GBP",
      allocations: [
        { category: "Housing", amount: 1300.26 },
        { category: "Groceries", amount: 250 },
      ],
    });
    expect(after?.costs).toEqual(before?.costs);
    expect(after?.wallets).toEqual(before?.wallets);
  });

  test("updates the existing budget and supports removing all categories", async () => {
    const t = await setup();
    await t.mutation(api.accounts.saveBudget, {
      allocations: [{ category: "Housing", amount: 500 }],
    });
    await t.mutation(api.accounts.saveBudget, {
      allocations: [{ category: "Housing", amount: 600 }],
    });
    const current = await t.query(api.accounts.bootstrap, {
      email: "dara@financialpassport.demo",
    });
    expect(current?.config.budget.allocations).toEqual([
      { category: "Housing", amount: 600 },
    ]);
    const rows = await t.run((ctx) =>
      ctx.db
        .query("appConfig")
        .withIndex("by_account_and_key", (q) =>
          q.eq("accountId", current!.account._id).eq("key", "budget"),
        )
        .take(2),
    );
    expect(rows).toHaveLength(1);
    await t.mutation(api.accounts.saveBudget, { allocations: [] });
    const data = await t.query(api.accounts.bootstrap, {
      email: "dara@financialpassport.demo",
    });
    expect(data?.config.budget.allocations).toEqual([]);
  });

  test.each(
    [
      [{ category: "Housing", amount: -1 }],
      [{ category: " ", amount: 100 }],
      [{ category: "x".repeat(61), amount: 100 }],
      [{ category: "Housing", amount: 1_000_000_001 }],
      [
        { category: "Housing", amount: 100 },
        { category: " housing ", amount: 200 },
      ],
      Array.from({ length: 21 }, (_, index) => ({
        category: `Category ${index}`,
        amount: 1,
      })),
    ].map((allocations) => ({ allocations })),
  )(
    "rejects invalid categories without changing the saved budget: $allocations",
    async ({ allocations }) => {
      const t = await setup();
      const original = [{ category: "Housing", amount: 500 }];
      await t.mutation(api.accounts.saveBudget, { allocations: original });
      await expect(
        t.mutation(api.accounts.saveBudget, { allocations }),
      ).rejects.toThrow();
      const data = await t.query(api.accounts.bootstrap, {
        email: "dara@financialpassport.demo",
      });
      expect(data?.config.budget.allocations).toEqual(original);
    },
  );
});
