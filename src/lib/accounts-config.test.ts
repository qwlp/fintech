import { describe, expect, it, vi } from "vitest";
import { ensureConfig, sendMessage, transitionPayment, resetPayment } from "../../convex/accounts";

function configDatabase(rows: Array<{ _id: string; key: string; value: Record<string, unknown> }>) {
  return {
    query: () => ({ withIndex: () => ({ collect: async () => rows }) }),
    insert: vi.fn(async (_table: string, record: { accountId: string; key: string; value: Record<string, unknown> }) => { rows.push({ _id: record.key, ...record }); }),
    patch: vi.fn(async (id: string, update: { value: Record<string, unknown> }) => { Object.assign(rows.find((row) => row._id === id)!, update); }),
  };
}

describe("demo configuration migration", () => {
  it("repairs legacy payment fields while retaining recipient settings", async () => {
    const rows = [{ _id: "banking", key: "banking", value: { recipient: "Existing University", swift: "EXISTING" } }];
    const db = configDatabase(rows);
    await (ensureConfig as any)._handler({ db }, { accountId: "demo" });
    expect(rows[0].value).toMatchObject({ recipient: "Existing University", swift: "EXISTING", paymentAmount: 2000, recipientAccountLast4: "1842" });
  });

  it("preserves an existing payment amount and is idempotent", async () => {
    const rows = [{ _id: "banking", key: "banking", value: { paymentAmount: 3500 } }];
    const db = configDatabase(rows);
    await (ensureConfig as any)._handler({ db }, { accountId: "demo" });
    expect(rows[0].value.paymentAmount).toBe(3500);
    db.insert.mockClear();
    db.patch.mockClear();
    await (ensureConfig as any)._handler({ db }, { accountId: "demo" });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.patch).not.toHaveBeenCalled();
  });
});


describe("payment and chat behavior", () => {
  it("recognizes the pay-next prompt and persists both chat messages", async () => {
    const insert = vi.fn();
    const data: Record<string, unknown[]> = {
      costs: [{ amount: 24600 }], funding: [{ amount: 21900, status: "confirmed" }],
      paymentRoutes: [{ provider: "Provider A", sourceAmount: 2574.6, fee: 8.4 }],
      appConfig: [{ key: "banking", value: { paymentAmount: 2000 } }],
    };
    const db = { insert, query: (table: string) => ({ withIndex: () => ({ collect: async () => data[table] }) }) };
    await (sendMessage as any)._handler({ db }, { accountId: "demo", text: "What should I pay next?" });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][1]).toMatchObject({ from: "agent", text: expect.stringContaining("£2,000") });
    expect(insert.mock.calls[1][1].text).toContain("Provider A");
  });

  it("rejects payment transitions with missing amounts", async () => {
    const patch = vi.fn();
    const db = {
      get: async () => ({ paymentStatus: "prepared", selectedRoute: "wise" }), patch,
      query: (table: string) => ({ withIndex: () => ({ collect: async () => table === "appConfig" ? [] : [{ key: "wise", fxRate: 0.774 }] }) }),
    };
    await expect((transitionPayment as any)._handler({ db }, { accountId: "demo", next: "approved" })).rejects.toThrow("Payment details unavailable");
    expect(patch).not.toHaveBeenCalled();
  });
});


describe("sandbox payment recovery", () => {
  it("resets completed payments and records that fresh approval is required", async () => {
    const patch = vi.fn(), insert = vi.fn();
    const db = { get: async () => ({ name: "Dara", paymentStatus: "completed" }), patch, insert };
    await (resetPayment as any)._handler({ db }, { accountId: "demo" });
    expect(patch).toHaveBeenCalledWith("demo", { paymentStatus: "not_started" });
    expect(insert).toHaveBeenCalledWith("auditEvents", expect.objectContaining({ type: "PAYMENT_RESET" }));
  });

  it("completes an approved sandbox payment and records its receipt", async () => {
    const patch = vi.fn(), insert = vi.fn();
    const db = {
      get: async () => ({ name: "Dara", paymentStatus: "approved", selectedRoute: "wise" }), patch, insert,
      query: (table: string) => ({ withIndex: () => ({ collect: async () => table === "appConfig" ? [{ key: "banking", value: { paymentAmount: 2000, transactionReference: "TEST" } }] : [{ key: "wise", fxRate: 0.774, provider: "Provider A" }] }) }),
    };
    await (transitionPayment as any)._handler({ db }, { accountId: "demo", next: "completed" });
    expect(patch).toHaveBeenCalledWith("demo", { paymentStatus: "completed" });
    expect(insert).toHaveBeenCalledWith("auditEvents", expect.objectContaining({ type: "PAYMENT_EXECUTED" }));
    expect(insert).toHaveBeenCalledWith("notifications", expect.objectContaining({ title: "Payment completed" }));
  });
});
