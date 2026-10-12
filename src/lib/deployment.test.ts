import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe("runtime deployment settings", () => {
  it("provides a working public rate service when no endpoint is configured", async () => {
    vi.stubEnv("VITE_FX_RATES_URL", "");
    vi.stubEnv("VITE_FX_SOURCE_URL", "");
    vi.stubGlobal("window", {});
    const { deployment } = await import("./deployment");
    expect(deployment.fxRatesUrl).toBe("https://api.frankfurter.dev/v2/rates");
    expect(deployment.fxSourceUrl).toBe("https://frankfurter.dev/");
  });
  it("overrides baked-in service URLs, including disabling external rates", async () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://old-backend.invalid");
    vi.stubEnv("VITE_FX_RATES_URL", "https://old-rates.invalid");
    vi.stubGlobal("window", {
      MOVEWISE_CONFIG: { convexUrl: "http://localhost:3210", fxRatesUrl: "" },
    });
    const { deployment } = await import("./deployment");
    expect(deployment.convexUrl).toBe("http://localhost:3210");
    expect(deployment.fxRatesUrl).toBe("");
  });
  it("uses explicit build settings when runtime settings are absent", async () => {
    vi.stubEnv("VITE_CONVEX_URL", "http://localhost:3210");
    vi.stubGlobal("window", {});
    const { deployment } = await import("./deployment");
    expect(deployment.convexUrl).toBe("http://localhost:3210");
  });
});
