/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
const png = () =>
  Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
    ),
    (c) => c.charCodeAt(0),
  ).buffer;
async function fixture() {
  const t = convexTest(schema, modules);
  const { accountId, userId, otherId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "profile@example.com",
    });
    const otherId = await ctx.db.insert("users", {
      email: "other@example.com",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "profile@example.com",
      name: "Student",
      initials: "S",
      role: "Student",
      planName: "Study",
      countryFrom: "China",
      countryTo: "United Kingdom",
      university: "",
      course: "",
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
    });
    return { accountId, userId, otherId };
  });
  return {
    t,
    accountId,
    owner: t.withIdentity({ subject: `${userId}|session` }),
    other: t.withIdentity({ subject: `${otherId}|session` }),
  };
}
describe("linked account removal", () => {
  it("removes exactly the selected account and preserves other profile settings", async () => {
    const { owner, accountId } = await fixture();
    await owner.mutation(api.accounts.addCountryAccount, {
      accountId,
      country: "China",
      label: "Savings",
    });
    await owner.mutation(api.accounts.addCountryAccount, {
      accountId,
      country: "US",
      label: "Bank of America",
    });
    let result = await owner.query(api.accounts.bootstrap, {});
    const item = result.config.profile.countryAccounts[1];
    expect(item.id).toBeTruthy();
    // A stable ID still identifies the right row after its array position changes.
    result = await owner.query(api.accounts.bootstrap, {});
    await owner.mutation(api.accounts.removeCountryAccount, {
      accountId,
      id: item.id,
      country: item.country,
      label: item.label,
      index: 99,
    });
    result = await owner.query(api.accounts.bootstrap, {});
    expect(result.config.profile.countryAccounts).toHaveLength(1);
    expect(result.config.profile.countryAccounts[0].label).toBe("Savings");
    expect(result.account.countryTo).toBe("United Kingdom");
    expect(result.auditEvents[0].type).toBe("LINKED_ACCOUNT_REMOVED");
  });
  it("supports legacy duplicates and rejects stale positions and other users", async () => {
    const { t, owner, other, accountId } = await fixture();
    await t.run((ctx) =>
      ctx.db.insert("appConfig", {
        accountId,
        key: "profile",
        value: {
          fundingAmount: 12000,
          countryAccounts: [
            { country: "China", label: "Savings" },
            { country: "China", label: "Savings" },
          ],
        },
      }),
    );
    const args = { accountId, index: 1, country: "China", label: "Savings" };
    await expect(
      other.mutation(api.accounts.removeCountryAccount, args),
    ).rejects.toThrow("Account access denied");
    await expect(
      t.mutation(api.accounts.removeCountryAccount, args),
    ).rejects.toThrow("Sign in");
    await owner.mutation(api.accounts.removeCountryAccount, args);
    await expect(
      owner.mutation(api.accounts.removeCountryAccount, args),
    ).rejects.toThrow("changed");
    const result = await owner.query(api.accounts.bootstrap, {});
    expect(result.config.profile.countryAccounts).toHaveLength(1);
    expect(result.config.profile.fundingAmount).toBe(12000);
  });
});
describe("profile pictures", () => {
  it("uploads, replaces, resolves and removes pictures, deleting unused files", async () => {
    const { t, owner, accountId } = await fixture();
    await owner.action(api.accounts.uploadProfilePicture, {
      image: png(),
      contentType: "image/png",
    });
    const first = (await t.run((ctx) => ctx.db.get(accountId)))!
      .avatarStorageId!;
    expect(
      (await owner.query(api.accounts.bootstrap, {})).account.avatarUrl,
    ).toBeTruthy();
    await owner.action(api.accounts.uploadProfilePicture, {
      image: png(),
      contentType: "image/png",
    });
    const second = (await t.run((ctx) => ctx.db.get(accountId)))!
      .avatarStorageId!;
    expect(second).not.toBe(first);
    expect(
      await t.run((ctx) => ctx.db.system.get("_storage", first)),
    ).toBeNull();
    await owner.mutation(api.accounts.removeProfilePicture, {});
    expect(
      (await owner.query(api.accounts.bootstrap, {})).account.avatarUrl,
    ).toBeNull();
    expect(
      await t.run((ctx) => ctx.db.system.get("_storage", second)),
    ).toBeNull();
    await owner.mutation(api.accounts.removeProfilePicture, {});
  });
  it("rejects anonymous uploads, malformed files, oversized photos and impersonation", async () => {
    const { t, owner, other, accountId } = await fixture();
    await expect(
      t.action(api.accounts.uploadProfilePicture, {
        image: png(),
        contentType: "image/png",
      }),
    ).rejects.toThrow("Sign in");
    await expect(
      owner.action(api.accounts.uploadProfilePicture, {
        image: new Uint8Array([1, 2, 3]).buffer,
        contentType: "image/png",
      }),
    ).rejects.toThrow("valid");
    await expect(
      owner.action(api.accounts.uploadProfilePicture, {
        image: new Uint8Array(1024 * 1024 + 1).buffer,
        contentType: "image/png",
      }),
    ).rejects.toThrow("valid");
    await owner.action(api.accounts.uploadProfilePicture, {
      image: png(),
      contentType: "image/png",
    });
    const storageId = (await t.run((ctx) => ctx.db.get(accountId)))!
      .avatarStorageId!;
    await expect(
      other.mutation(internal.accounts.attachProfilePicture, {
        accountId,
        storageId,
      }),
    ).rejects.toThrow("Account access denied");
    expect((await t.run((ctx) => ctx.db.get(accountId)))!.avatarStorageId).toBe(
      storageId,
    );
  });
});
