import { describe, expect, it, vi } from "vitest";
import {
  ensureConfig,
  sendMessage,
  chatContext,
  saveChatExchange,
} from "../../convex/accounts";
import { requestReply } from "../../convex/openrouter";

vi.mock("../../convex/ownership", () => ({
  requireAccount: vi.fn(async () => ({
    _id: "demo",
    email: "dara@financialpassport.demo",
    role: "Student",
    aiConsentAt: 1,
  })),
}));

vi.mock("../../convex/openrouter", () => ({
  requestReply: vi.fn(async () => "Review your tuition payment."),
}));

function configDatabase(
  rows: Array<{ _id: string; key: string; value: Record<string, unknown> }>,
) {
  return {
    query: () => ({ withIndex: () => ({ collect: async () => rows }) }),
    insert: vi.fn(
      async (
        _table: string,
        record: {
          accountId: string;
          key: string;
          value: Record<string, unknown>;
        },
      ) => {
        rows.push({ _id: record.key, ...record });
      },
    ),
    patch: vi.fn(
      async (id: string, update: { value: Record<string, unknown> }) => {
        Object.assign(
          rows.find((row) => row._id === id)!,
          update,
        );
      },
    ),
  };
}

describe("demo configuration migration", () => {
  it("repairs legacy payment fields while retaining recipient settings", async () => {
    const rows = [
      {
        _id: "banking",
        key: "banking",
        value: { recipient: "Existing University", swift: "EXISTING" },
      },
    ];
    const db = configDatabase(rows);
    await (ensureConfig as any)._handler({ db }, { accountId: "demo" });
    expect(rows[0].value).toMatchObject({
      recipient: "Existing University",
      swift: "EXISTING",
      paymentAmount: 2000,
      recipientAccountLast4: "1842",
    });
  });

  it("preserves an existing payment amount and is idempotent", async () => {
    const rows = [
      { _id: "banking", key: "banking", value: { paymentAmount: 3500 } },
    ];
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
  it("preserves completed tool evidence if the subsequent model explanation times out", async () => {
    vi.mocked(requestReply).mockImplementationOnce(
      async (_context, _text, execute) => {
        await execute!("compare_payment_routes", {});
        throw new Error("The operation timed out");
      },
    );
    const result = { recommendedRouteKey: "sandbox-standard", routes: [] };
    const runMutation = vi.fn(async (_ref, args) =>
      args.name ? result : undefined,
    );
    await (sendMessage as any)._handler(
      { runQuery: vi.fn(async () => ({ gap: 0, history: [] })), runMutation },
      { accountId: "demo", text: "Compare routes" },
    );
    expect(runMutation.mock.calls.at(-1)?.[1]).toMatchObject({
      reply: expect.stringContaining("AI explanation could not complete"),
      toolResults: [{ name: "compare_payment_routes", result }],
    });
  });
  it("calls the AI with authorized context and saves the completed exchange", async () => {
    const runQuery = vi.fn(async () => ({ gap: 2700, history: [] }));
    const runMutation = vi.fn();
    await (sendMessage as any)._handler(
      { runQuery, runMutation },
      { accountId: "demo", text: " What should I pay next? " },
    );
    expect(runQuery).toHaveBeenCalledWith(expect.anything(), {
      accountId: "demo",
    });
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      accountId: "demo",
      text: "What should I pay next?",
      reply: "Review your tuition payment.",
      toolResults: [],
    });
  });

  it("does not persist a chat exchange when account access is denied", async () => {
    const runMutation = vi.fn();
    const runQuery = vi.fn(async () => {
      throw new Error("Account access denied");
    });
    await expect(
      (sendMessage as any)._handler(
        { runQuery, runMutation },
        { accountId: "other", text: "Hello" },
      ),
    ).rejects.toThrow("Account access denied");
    expect(runMutation).not.toHaveBeenCalled();
  });
});

describe("conversation isolation", () => {
  it("queries recent history only for the selected conversation and account", async () => {
    const eq = vi.fn();
    const range = {
      eq: (...args: unknown[]) => {
        eq(...args);
        return range;
      },
    };
    const db = {
      query: (table: string) => ({
        withIndex: (_index: string, filter: (q: typeof range) => unknown) => {
          filter(range);
          return {
            collect: async () => [],
            order: () => ({
              take: async () => [{ from: "user", text: "Selected chat only" }],
            }),
          };
        },
      }),
    };
    const result = await (chatContext as any)._handler(
      { db },
      { accountId: "demo", chatId: "selected" },
    );
    expect(eq).toHaveBeenCalledWith("accountId", "demo");
    expect(eq).toHaveBeenCalledWith("chatId", "selected");
    expect(result.history).toEqual([
      { role: "user", content: "Selected chat only" },
    ]);
  });

  it("saves both messages in the same conversation without deleting history", async () => {
    const insert = vi.fn();
    await (saveChatExchange as any)._handler(
      { db: { insert } },
      {
        accountId: "demo",
        chatId: "selected",
        text: "Hello",
        reply: "Hi",
      },
    );
    expect(insert).toHaveBeenCalledTimes(2);
    for (const call of insert.mock.calls)
      expect(call[1]).toMatchObject({ accountId: "demo", chatId: "selected" });
  });
});
