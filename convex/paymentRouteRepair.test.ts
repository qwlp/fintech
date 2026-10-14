import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");

it("repairs only the requested account and preserves the remaining quote terms", async () => {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const ids = [];
    for (const name of ["Dara", "Other"]) {
      const accountId = await ctx.db.insert("accounts", {
        name,
        email: `${name}@example.test`,
        initials: "D",
        role: "Student",
        planName: "Study",
        countryFrom: "UK",
        countryTo: "US",
        university: "USC",
        course: "",
        paymentStatus: "not_started",
        selectedRoute: "card",
        sponsorRequestSent: false,
      });
      for (const [key, provider] of [
        ["wise", "Provider A"],
        ["sandbox-platform", "Education Platforms"],
        ["swift", "Bank SWIFT"],
        ["card", "International card"],
      ]) {
        await ctx.db.insert("paymentRoutes", {
          accountId,
          key,
          provider,
          sourceAmount: 530,
          fee: 15,
          fxRate: 1.3246,
          delivery: "2–3 business days",
        });
      }
      ids.push(accountId);
    }
    return ids;
  });
  const read = () =>
    t.run(async (ctx) => ({
      routes: await ctx.db
        .query("paymentRoutes")
        .withIndex("by_account", (q) => q.eq("accountId", ids[0]))
        .take(10),
      other: await ctx.db
        .query("paymentRoutes")
        .withIndex("by_account", (q) => q.eq("accountId", ids[1]))
        .take(10),
      account: await ctx.db.get(ids[0]),
    }));
  const before = await read();
  expect(
    await t.mutation(internal.accounts.repairPaymentRouteCategories, {
      accountId: ids[0],
    }),
  ).toBe(1);
  const after = await read();
  expect(after.routes).toEqual(
    before.routes.filter((route) => route.key !== "card"),
  );
  expect(after.other).toEqual(before.other);
  expect(after.account?.selectedRoute).toBe("sandbox-platform");
  expect(
    await t.mutation(internal.accounts.repairPaymentRouteCategories, {
      accountId: ids[0],
    }),
  ).toBe(0);
});
