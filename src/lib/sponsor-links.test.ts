import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
const modules = import.meta.glob("../../convex/**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules);
  async function account(role: string, name: string) {
    const ids = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name });
      const accountId = await ctx.db.insert("accounts", {
        userId,
        email: `${name}@example.com`,
        name,
        initials: name[0],
        role,
        planName: "",
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
      ...ids,
      client: t.withIdentity({ subject: `${ids.userId}|session` }),
    };
  }
  return {
    t,
    student: await account("Student", "Student"),
    sponsor: await account("Sponsor", "Sponsor"),
    other: await account("Sponsor", "Other"),
  };
}
describe("sponsor invitations", () => {
  it("connects once, exposes only names, and allows the student to revoke access", async () => {
    const { student, sponsor, other } = await fixture();
    await student.client.mutation(api.sponsorLinks.createInvite, {});
    const invite = (await student.client.query(api.sponsorLinks.overview, {}))
      .invite!;
    await sponsor.client.mutation(api.sponsorLinks.connect, {
      code: invite.code
        .toLowerCase()
        .match(/.{1,4}/g)!
        .join("-"),
    });
    const overview = await sponsor.client.query(api.sponsorLinks.overview, {});
    expect(overview.links).toHaveLength(1);
    expect(Object.keys(overview.links[0]).sort()).toEqual(["id", "name"]);
    expect(overview.links[0].name).toBe("Student");
    await expect(
      other.client.mutation(api.sponsorLinks.connect, { code: invite.code }),
    ).rejects.toThrow("already used");
    await expect(
      other.client.mutation(api.sponsorLinks.disconnect, {
        id: overview.links[0].id,
      }),
    ).rejects.toThrow("denied");
    await student.client.mutation(api.sponsorLinks.disconnect, {
      id: overview.links[0].id,
    });
    expect(
      (await sponsor.client.query(api.sponsorLinks.overview, {})).links,
    ).toEqual([]);
  });
  it("rejects expired, replaced, anonymous, and wrong-role invitations", async () => {
    const { t, student, sponsor } = await fixture();
    await expect(t.query(api.sponsorLinks.overview, {})).rejects.toThrow(
      "Sign in",
    );
    await expect(
      sponsor.client.mutation(api.sponsorLinks.createInvite, {}),
    ).rejects.toThrow("Only students");
    await student.client.mutation(api.sponsorLinks.createInvite, {});
    const first = (await student.client.query(api.sponsorLinks.overview, {}))
      .invite!;
    await expect(
      student.client.mutation(api.sponsorLinks.connect, { code: first.code }),
    ).rejects.toThrow("sponsor account");
    await student.client.mutation(api.sponsorLinks.createInvite, {});
    await expect(
      sponsor.client.mutation(api.sponsorLinks.connect, { code: first.code }),
    ).rejects.toThrow("invalid");
    const current = (await student.client.query(api.sponsorLinks.overview, {}))
      .invite!;
    await t.run((ctx) =>
      ctx.db.patch(current._id, { expiresAt: Date.now() - 1 }),
    );
    await expect(
      sponsor.client.mutation(api.sponsorLinks.connect, { code: current.code }),
    ).rejects.toThrow("expired");
  });
  it("isolates sponsor dashboards and persists commitments without exposing private data", async () => {
    const { student, sponsor, other } = await fixture();
    await student.client.mutation(api.sponsorLinks.createInvite, {});
    const invite = (await student.client.query(api.sponsorLinks.overview, {}))
      .invite!;
    await sponsor.client.mutation(api.sponsorLinks.connect, {
      code: invite.code,
    });
    const [link] = await sponsor.client.query(api.sponsorLinks.dashboard, {});
    await student.client.mutation(api.accounts.createSponsorRequest, {
      accountId: student.accountId,
      sponsorKey: String(sponsor.accountId),
      amount: 500,
      purpose: "Tuition",
      neededBy: "2026-11-15",
    });
    expect(link.requests).toEqual([]);
    await expect(
      other.client.mutation(api.sponsorLinks.updateCommitment, {
        id: link.id,
        amount: 500,
      }),
    ).rejects.toThrow("denied");
    await expect(
      sponsor.client.mutation(api.sponsorLinks.updateCommitment, {
        id: link.id,
        amount: -1,
      }),
    ).rejects.toThrow("valid commitment");
    await sponsor.client.mutation(api.sponsorLinks.updateCommitment, {
      id: link.id,
      amount: 1500,
    });
    await student.client.mutation(api.accounts.setSponsorPermission, {
      accountId: student.accountId,
      sponsorKey: String(sponsor.accountId),
      permission: "Funding requests",
      enabled: true,
    });
    const [updated] = await sponsor.client.query(
      api.sponsorLinks.dashboard,
      {},
    );
    expect(updated.commitment).toBe(1500);
    expect(updated.requests).toHaveLength(1);
    expect(updated.requests[0].amount).toBe(500);
    expect(Object.keys(updated).sort()).toEqual([
      "commitment",
      "id",
      "name",
      "permissions",
      "requests",
    ]);
    expect(await other.client.query(api.sponsorLinks.dashboard, {})).toEqual(
      [],
    );
    await expect(
      student.client.query(api.sponsorLinks.dashboard, {}),
    ).rejects.toThrow("Sponsor account");
    await student.client.mutation(api.sponsorLinks.disconnect, { id: link.id });
    expect(await sponsor.client.query(api.sponsorLinks.dashboard, {})).toEqual(
      [],
    );
  });
});
