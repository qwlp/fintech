// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
const email = "dara@financialpassport.demo";
const sponsor = {
  name: "Lina",
  email: "lina@example.com",
  relationship: "Aunt",
  commitment: 1500.255,
  nextDate: "2026-11-15",
};

test.each([true, false])(
  "sponsor linking requires user approval: accept=%s",
  async (accept) => {
    const t = convexTest(schema, modules);
    await t.mutation(api.accounts.seedDemo, {});
    const before = (await t.query(api.accounts.bootstrap, { email }))!;
    await t.mutation(api.accounts.sendSponsorLinkRequest, {
      ...sponsor,
      userCode: before.userCode,
    });
    const pending = (await t.query(api.accounts.bootstrap, { email }))!;
    expect(pending.sponsors).toEqual(before.sponsors);
    expect(pending.sponsorLinks).toHaveLength(1);
    expect(
      pending.notifications.some(
        (n) => n.title === "New sponsor request" && !n.read,
      ),
    ).toBe(true);
    await expect(
      t.mutation(api.accounts.sendSponsorLinkRequest, {
        ...sponsor,
        userCode: before.userCode,
      }),
    ).rejects.toThrow("already");
    await t.mutation(api.accounts.respondSponsorLink, {
      requestId: pending.sponsorLinks[0]._id,
      accept,
    });
    const after = (await t.query(api.accounts.bootstrap, { email }))!;
    expect(after.sponsorLinks).toHaveLength(0);
    expect(after.sponsors).toHaveLength(
      before.sponsors.length + Number(accept),
    );
    expect(after.funding).toEqual(before.funding);
    if (accept)
      expect(after.sponsors.at(-1)).toMatchObject({
        name: "Lina",
        commitment: 1500.26,
        permissions: [],
      });
    await expect(
      t.mutation(api.accounts.respondSponsorLink, {
        requestId: pending.sponsorLinks[0]._id,
        accept,
      }),
    ).rejects.toThrow("already");
  },
);

test("a request cannot be reviewed from another move", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.accounts.seedDemo, {});
  const root = (await t.query(api.accounts.bootstrap, { email }))!;
  const workspaceId = await t.mutation(api.accounts.createMoveProfile, {
    name: "Work",
    type: "work",
    countryFrom: "Cambodia",
    countryTo: "Singapore",
    arrivalDate: "2027-01-01",
  });
  await t.mutation(api.accounts.sendSponsorLinkRequest, {
    ...sponsor,
    userCode: root.userCode,
  });
  const pending = (await t.query(api.accounts.bootstrap, { email }))!;
  await expect(
    t.mutation(api.accounts.respondSponsorLink, {
      workspaceId,
      requestId: pending.sponsorLinks[0]._id,
      accept: true,
    }),
  ).rejects.toThrow("Request not found");
});

test.each([
  { name: " " },
  { email: "invalid" },
  { commitment: -1 },
  { nextDate: "2026-02-30" },
  { userCode: "FP-invalid" },
])("rejects invalid sponsor request: %j", async (invalid) => {
  const t = convexTest(schema, modules);
  await t.mutation(api.accounts.seedDemo, {});
  const root = (await t.query(api.accounts.bootstrap, { email }))!;
  await expect(
    t.mutation(api.accounts.sendSponsorLinkRequest, {
      ...sponsor,
      userCode: root.userCode,
      ...invalid,
    }),
  ).rejects.toThrow();
});
