/** Deployment-owned OpenAI-compatible service configuration. No external defaults. */
export function aiConfiguration(values: Record<string, string | undefined>) {
  const provider = values.AI_PROVIDER || "openai-compatible";
  if (!["openai-compatible", "openrouter"].includes(provider))
    throw new Error("AI_PROVIDER must be openai-compatible or openrouter");
  const base = values.AI_BASE_URL?.trim();
  const model = values.AI_MODEL || values.OPENROUTER_MODEL;
  if (!base || !model) throw new Error("Configure AI_BASE_URL and AI_MODEL");
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "AI_BASE_URL must be an HTTP(S) base URL without credentials, query or fragment",
    );
  const key =
    values.AI_API_KEY || values.OPENROUTER_KEY || values.OPENROUTER_API_KEY;
  if (!key && values.AI_ALLOW_NO_KEY !== "true")
    throw new Error(
      "Configure AI_API_KEY, or explicitly enable AI_ALLOW_NO_KEY for a local service",
    );
  const timeoutMs = Number(values.AI_TIMEOUT_MS || "45000");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300000)
    throw new Error("AI_TIMEOUT_MS must be between 1000 and 300000");
  return {
    provider,
    model,
    key,
    timeoutMs,
    endpoint: `${base.replace(/\/+$/, "")}/chat/completions`,
  };
}
