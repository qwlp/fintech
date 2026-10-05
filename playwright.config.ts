import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  workers: 1, // Bound CPU/GPU contention from animated previews.
  testDir: "./e2e",
  testMatch: "**/*.pw.ts",
  use: {
    baseURL: "http://127.0.0.1:5174",
    launchOptions: {
      executablePath: existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined,
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "bun run dev -- --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: true,
  },
});
