// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
const email = "dara@financialpassport.demo";
const profile = {
  name: "Singapore work",
  type: "work" as const,
  countryFrom: "Cambodia",
  countryTo: "Singapore",
  arrivalDate: "2027-01-15",
};

test("new moves start clean and budget, sponsors, requests and activity stay separate", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.accounts.seedDemo, {});
  const original = await t.query(api.accounts.bootstrap, { email });
  const workspaceId = await t.mutation(api.accounts.createMoveProfile, profile);
  const secondId = await t.mutation(api.accounts.createMoveProfile, {
    ...profile,
    name: "Japan travel",
    type: "travel",
    countryTo: "Japan",
  });
  const fresh = await t.query(api.accounts.bootstrap, { email, workspaceId });
  expect(fresh!.moveProfiles).toHaveLength(3);
  expect(fresh!.account).toMatchObject({
    moveType: "work",
    countryTo: "Singapore",
  });
  for (const rows of [
    fresh!.costs,
    fresh!.funding,
    fresh!.sponsors,
    fresh!.paymentRoutes,
    fresh!.sponsorRequests,
  ])
    expect(rows).toHaveLength(0);
  expect(fresh!.wallets.every((wallet) => wallet.amount === 0)).toBe(true);
  await t.mutation(api.accounts.saveBudget, {
    workspaceId,
    allocations: [{ category: "Rent", amount: 900 }],
  });
  await t.mutation(api.accounts.sendSponsorLinkRequest, {
    userCode: `FP-${workspaceId}`,
    email: "lina@example.com",
    name: "Lina",
    relationship: "Aunt",
    commitment: 500,
    nextDate: "2027-01-01",
  });
  const pending = await t.query(api.accounts.bootstrap, { email, workspaceId });
  await t.mutation(api.accounts.respondSponsorLink, {
    workspaceId,
    requestId: pending!.sponsorLinks[0]._id,
    accept: true,
  });
  const updated = await t.query(api.accounts.bootstrap, { email, workspaceId });
  const sponsor = updated!.sponsors[0];
  await t.mutation(api.accounts.createSponsorRequest, {
    accountId: workspaceId,
    sponsorKey: sponsor.key,
    amount: 100,
    purpose: "Rent",
    neededBy: "2027-01-01",
  });
  const active = await t.query(api.accounts.bootstrap, { email, workspaceId });
  expect(active!.config.budget.allocations).toEqual([
    { category: "Rent", amount: 900 },
  ]);
  expect(active!.sponsorRequests).toHaveLength(1);
  const other = await t.query(api.accounts.bootstrap, {
    email,
    workspaceId: secondId,
  });
  expect(other!.config.budget.allocations).toEqual([]);
  expect(other!.sponsors).toHaveLength(0);
  expect(other!.sponsorRequests).toHaveLength(0);
  expect(other!.auditEvents.every((row) => row.accountId === secondId)).toBe(
    true,
  );
  const restored = await t.query(api.accounts.bootstrap, {
    email,
    workspaceId: original!.account._id,
  });
  expect(restored!.wallets).toEqual(original!.wallets);
  expect(restored!.sponsors).toEqual(original!.sponsors);
  expect(restored!.config.budget).toEqual(original!.config.budget);
  expect(restored!.auditEvents).toEqual(original!.auditEvents);
});

test("cannot select or save into another owner's workspace", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.accounts.seedDemo, {});
  const original = await t.query(api.accounts.bootstrap, { email });
  const foreignId = await t.run(async (ctx) => {
    const { _id, _creationTime, ...fields } = original!.account;
    return ctx.db.insert("accounts", { ...fields, email: "other@example.com" });
  });
  await expect(
    t.query(api.accounts.bootstrap, { email, workspaceId: foreignId }),
  ).rejects.toThrow("Move profile not found");
  await expect(
    t.mutation(api.accounts.saveBudget, {
      workspaceId: foreignId,
      allocations: [],
    }),
  ).rejects.toThrow("Move profile not found");
});

test.each([
  { name: " " },
  { countryFrom: " " },
  { countryTo: " " },
  { arrivalDate: "2027-02-30" },
])("rejects invalid move details: %j", async (invalid) => {
  const t = convexTest(schema, modules);
  await t.mutation(api.accounts.seedDemo, {});
  await expect(
    t.mutation(api.accounts.createMoveProfile, { ...profile, ...invalid }),
  ).rejects.toThrow();
});
