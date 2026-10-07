import { beforeAll, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { decodeJwt, exportJWK, exportPKCS8, generateKeyPair } from "jose";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.ts");
beforeAll(async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  vi.stubEnv("CONVEX_SITE_URL", "https://auth-test.convex.site");
  vi.stubEnv(
    "JWT_PRIVATE_KEY",
    (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, " "),
  );
  vi.stubEnv(
    "JWKS",
    JSON.stringify({
      keys: [{ use: "sig", ...(await exportJWK(keys.publicKey)) }],
    }),
  );
});
async function accountFixture(role = "Student") {
  const t = convexTest(schema, modules);
  const account = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "owner@example.com",
      name: "Owner",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "owner@example.com",
      name: "Owner",
      initials: "O",
      role,
      planName: "My Study Plan",
      countryFrom: "",
      countryTo: "",
      university: "",
      course: "",
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
    });
    return { userId, accountId };
  });
  return {
    t,
    owner: t.withIdentity({ subject: `${account.userId}|session` }),
    ...account,
  };
}
describe("account authorization", () => {
  it("saves setup details and preserves existing profile preferences", async () => {
    const { t, owner, accountId } = await accountFixture();
    await t.run(ctx => ctx.db.insert("appConfig", { accountId, key: "profile", value: { financialStatus: "Planning" } }));
    await owner.mutation(api.accounts.completeSetup, {
      name: " Dara Chan ", countryFrom: "Cambodia", countryTo: "United Kingdom",
      university: "", course: "", courseStart: "2027-09", fundingAmount: 12000, sponsorSupport: "Yes",
    });
    const result = await owner.query(api.accounts.bootstrap, {});
    expect(result.account).toMatchObject({ name: "Dara Chan", initials: "DC", countryFrom: "Cambodia", countryTo: "United Kingdom", setupComplete: true });
    expect(result.config.profile).toMatchObject({ financialStatus: "Planning", fundingAmount: 12000, courseStart: "2027-09", homeCurrency: "KHR", studyCurrency: "GBP", fundingCurrency: "GBP" });
  });
  it("keeps currencies synchronized on profile edits and country account saves", async () => {
    const { owner, accountId } = await accountFixture();
    const details = { accountId, name: "Owner", countryFrom: "Cambodia", countryTo: "Canada", university: "University of Waterloo", course: "Computing", courseStart: "", financialStatus: "Planning", sponsorSupport: "Yes", fundingAmount: 1000 };
    await owner.mutation(api.accounts.updateProfile, details);
    let result = await owner.query(api.accounts.bootstrap, {});
    expect(result.config.profile).toMatchObject({ homeCurrency: "KHR", studyCurrency: "CAD", fundingCurrency: "CAD" });
    await expect(owner.mutation(api.accounts.updateProfile, { ...details, countryTo: "Germany" })).rejects.toThrow("study country");
    await owner.mutation(api.accounts.updateProfile, { ...details, countryTo: "Germany", university: "" });
    await owner.mutation(api.accounts.addCountryAccount, { accountId, country: "AU", label: "Study account" });
    result = await owner.query(api.accounts.bootstrap, {});
    expect(result.account).toMatchObject({ countryTo: "Germany", university: "" });
    expect(result.config.profile).toMatchObject({ studyCurrency: "EUR", fundingAmount: 1000, countryAccounts: [{ country: "Australia", currency: "AUD", label: "Study account" }] });
    await expect(owner.mutation(api.accounts.addCountryAccount, { accountId, country: "Unknown", label: "Account" })).rejects.toThrow("supported country");
  });
  it("provides only saved profile fields to the assistant and refreshes them after editing", async () => {
    const { owner, accountId } = await accountFixture();
    await owner.mutation(api.accounts.completeSetup, { name: "Dara", countryFrom: "Cambodia", countryTo: "Canada", university: "University of Waterloo", course: "Computing", courseStart: "2027-09", fundingAmount: 1000, sponsorSupport: "Yes" });
    const summary = await owner.query(internal.accounts.chatContext, { accountId });
    expect(summary.profile).toEqual({ name: "Dara", role: "Student", homeCountry: "Cambodia", studyCountry: "Canada", university: "University of Waterloo", course: "Computing", courseStart: "2027-09" });
    expect(summary.profile).not.toHaveProperty("email");
    expect(summary.profile).not.toHaveProperty("userId");
    await owner.mutation(api.accounts.updateProfile, { accountId, name: "Dara Chan", countryFrom: "Cambodia", countryTo: "Germany", university: "", course: "Engineering", courseStart: "", fundingAmount: 1000, sponsorSupport: "Yes", financialStatus: "Planning" });
    const updated = await owner.query(internal.accounts.chatContext, { accountId });
    expect(updated.profile).toMatchObject({ name: "Dara Chan", studyCountry: "Germany", course: "Engineering", university: "", courseStart: "" });
  });
  it("requires sign-in and valid details before completing setup", async () => {
    const { t, owner } = await accountFixture();
    const details = { name: "Owner", countryFrom: "Cambodia", countryTo: "UK", university: "", course: "", courseStart: "", fundingAmount: 0, sponsorSupport: "Not sure yet" };
    await expect(t.mutation(api.accounts.completeSetup, details)).rejects.toThrow("Sign in");
    await expect(owner.mutation(api.accounts.completeSetup, { ...details, fundingAmount: -1 })).rejects.toThrow("funding");
    await expect(owner.mutation(api.accounts.completeSetup, { ...details, countryTo: " " })).rejects.toThrow("study country");
    expect((await owner.query(api.accounts.bootstrap, {})).account.setupComplete).toBeUndefined();
  });
  it("lets sponsors finish without student details", async () => {
    const { owner } = await accountFixture("Sponsor");
    await owner.mutation(api.accounts.completeSetup, { name: "Sponsor", countryFrom: "Cambodia", countryTo: "", university: "", course: "", courseStart: "", fundingAmount: 0, sponsorSupport: "Not sure yet" });
    expect((await owner.query(api.accounts.bootstrap, {})).account.setupComplete).toBe(true);
  });
  it("rejects anonymous reads and writes", async () => {
    const { t, accountId } = await accountFixture();
    await expect(t.query(api.accounts.bootstrap, {})).rejects.toThrow(
      "Sign in",
    );
    await expect(
      t.mutation(api.accounts.setRoute, { accountId, route: "wise" }),
    ).rejects.toThrow("Sign in");
  });
  it("isolates a second user's reads and rejects writes to another account", async () => {
    const { t, owner, accountId } = await accountFixture();
    const otherUser = await t.run((ctx) =>
      ctx.db.insert("users", { email: "other@example.com" }),
    );
    const other = t.withIdentity({ subject: `${otherUser}|session` });
    await expect(other.query(api.accounts.bootstrap, {})).rejects.toThrow(
      "Account access denied",
    );
    await expect(
      other.mutation(api.accounts.resetPayment, { accountId }),
    ).rejects.toThrow("Account access denied");
    const result = await owner.query(api.accounts.bootstrap, {});
    expect(result.account._id).toBe(accountId);
    expect(result.costs).toEqual([]);
    expect(result.funding).toEqual([]);
  });
  it("keeps new account configuration free from demo data", async () => {
    const { owner, accountId } = await accountFixture();
    await owner.mutation(api.accounts.ensureConfig, { accountId });
    expect((await owner.query(api.accounts.bootstrap, {})).config).toEqual({});
  });
  it("persists the sponsor role separately from student accounts", async () => {
    const { owner } = await accountFixture("Sponsor");
    expect((await owner.query(api.accounts.bootstrap, {})).account.role).toBe(
      "Sponsor",
    );
  });
});

describe("email registration and login", () => {
  it.each(["Student", "Sponsor"])(
    "registers and logs in a %s with normalized email",
    async (role) => {
      const t = convexTest(schema, modules);
      const result = await t.action(api.auth.signIn, {
        provider: "password",
        params: {
          flow: "signUp",
          email: " Person@Example.com ",
          name: "Test Person",
          role,
          password: "secure-password-123",
        },
      });
      expect(result.tokens?.token).toBeTruthy();
      const account = await t.run((ctx) => ctx.db.query("accounts").unique());
      expect(account).toMatchObject({
        email: "person@example.com",
        name: "Test Person",
        role,
        setupComplete: false,
      });
      expect(account?.userId).toBeTruthy();
      const login = await t.action(api.auth.signIn, {
        provider: "password",
        params: {
          flow: "signIn",
          email: "PERSON@example.com",
          password: "secure-password-123",
          role: role === "Student" ? "Sponsor" : "Student",
        },
      });
      expect(login.tokens?.token).toBeTruthy();
      expect(
        (await t.run((ctx) => ctx.db.query("accounts").unique()))?.role,
      ).toBe(role);
      await expect(
        t.action(api.auth.signIn, {
          provider: "password",
          params: {
            flow: "signIn",
            email: "person@example.com",
            password: "wrong-password",
          },
        }),
      ).rejects.toThrow();
      await expect(
        t.action(api.auth.signIn, {
          provider: "password",
          params: {
            flow: "signUp",
            email: "person@example.com",
            name: "Duplicate",
            role,
            password: "different-password",
          },
        }),
      ).rejects.toThrow();
    },
  );
  it("rejects invalid roles and short passwords", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          flow: "signUp",
          email: "test@example.com",
          name: "Test",
          role: "Admin",
          password: "secure-password",
        },
      }),
    ).rejects.toThrow("Choose an account type");
    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          flow: "signUp",
          email: "test@example.com",
          name: "Test",
          role: "Student",
          password: "short",
        },
      }),
    ).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query("accounts").collect())).toEqual(
      [],
    );
  });
});

describe("session lifecycle", () => {
  it("invalidates the authenticated session on sign-out", async () => {
    const t = convexTest(schema, modules);
    const result = await t.action(api.auth.signIn, {
      provider: "password",
      params: {
        flow: "signUp",
        email: "logout@example.com",
        name: "Session Test",
        role: "Student",
        password: "secure-password-123",
      },
    });
    const subject = decodeJwt(result.tokens!.token).sub!;
    const signedIn = t.withIdentity({ subject });
    const sessionId = subject.split("|")[1];
    await signedIn.action(api.auth.signOut, {});
    expect(await t.run((ctx) => ctx.db.get(sessionId as any))).toBeNull();
  });
});
