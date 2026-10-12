import { describe, expect, it } from "vitest";
import { aiConfiguration } from "./ai-config";

describe("deployment AI configuration", () => {
  it("requires an explicit service and model", () => {
    expect(() => aiConfiguration({})).toThrow("AI_BASE_URL");
  });
  it("supports an unauthenticated local server only with explicit opt-in", () => {
    const settings = {
      AI_BASE_URL: "http://localhost:11434/v1/",
      AI_MODEL: "local-model",
    };
    expect(() => aiConfiguration(settings)).toThrow("AI_API_KEY");
    expect(
      aiConfiguration({ ...settings, AI_ALLOW_NO_KEY: "true" }),
    ).toMatchObject({
      endpoint: "http://localhost:11434/v1/chat/completions",
      model: "local-model",
      key: undefined,
    });
  });
  it("rejects credentials and invalid timeouts", () => {
    const settings = {
      AI_BASE_URL: "https://user:secret@localhost/v1",
      AI_MODEL: "model",
      AI_API_KEY: "key",
    };
    expect(() => aiConfiguration(settings)).toThrow("credentials");
    expect(() =>
      aiConfiguration({
        ...settings,
        AI_BASE_URL: "http://localhost/v1",
        AI_TIMEOUT_MS: "NaN",
      }),
    ).toThrow("AI_TIMEOUT_MS");
  });
});
