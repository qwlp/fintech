import { afterEach, describe, expect, it, vi } from "vitest";
import { requestReply } from "../../convex/openrouter";

const context = {
  totalCost: 24600, totalFunding: 21900, gap: 2700, coverage: 89,
  paymentAmount: 2000, bestProvider: "Provider A",
  history: [{ role: "user", content: "My earlier question" }],
};
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("OpenRouter replies", () => {
  it("sends the server key, inexpensive model, account summary and history", async () => {
    vi.stubEnv("OPENROUTER_KEY", "test-key");
    vi.stubEnv("OPENROUTER_MODEL", "");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: " Your gap is £2,700. " } }],
    })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await requestReply(context, "What is my gap?")).toBe("Your gap is £2,700.");
    const request = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(request[1].body as string);
    expect(request[1].headers).toMatchObject({ Authorization: "Bearer test-key" });
    expect(body).toMatchObject({ model: "minimax/minimax-m2.5", provider: { sort: "price" }, max_tokens: 2048 });
    expect(body.messages[0].content).toContain('"gap":2700');
    expect(body.messages.slice(1)).toEqual([...context.history, { role: "user", content: "What is my gap?" }]);
  });

  it("rejects provider failures without exposing their response body", async () => {
    vi.stubEnv("OPENROUTER_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("sensitive provider details", { status: 402 })));
    await expect(requestReply(context, "Hello")).rejects.toThrow("AI service unavailable (402)");
  });

  it("rejects empty completions", async () => {
    vi.stubEnv("OPENROUTER_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [] }))));
    await expect(requestReply(context, "Hello")).rejects.toThrow("empty reply");
  });
});
