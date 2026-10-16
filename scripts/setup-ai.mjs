import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

const envFileIndex = process.argv.indexOf("--env-file");
const envFile = envFileIndex >= 0 ? process.argv[envFileIndex + 1] : undefined;
if (envFileIndex >= 0 && !envFile) throw new Error("Missing --env-file path");
const values = {};
for (const file of envFile ? [envFile] : [".env", ".env.local"]) {
  if (existsSync(file))
    Object.assign(values, parseEnv(readFileSync(file, "utf8")));
}
// Explicit files are isolated from Bun's auto-loaded .env.local settings.
if (!envFile) Object.assign(values, process.env);
if (!values.AI_BASE_URL || !(values.AI_MODEL || values.OPENROUTER_MODEL))
  throw new Error("Set AI_BASE_URL and AI_MODEL in .env or the environment");
if (
  !(values.AI_API_KEY || values.OPENROUTER_KEY || values.OPENROUTER_API_KEY) &&
  values.AI_ALLOW_NO_KEY !== "true"
)
  throw new Error(
    "Set AI_API_KEY or explicitly set AI_ALLOW_NO_KEY=true for a local service",
  );
console.log(
  values.CONVEX_SELF_HOSTED_URL
    ? `Target: self-hosted backend at ${values.CONVEX_SELF_HOSTED_URL}`
    : `Target: ${values.CONVEX_DEPLOYMENT || "CLI-selected deployment"}`,
);
for (const name of [
  "AI_PROVIDER",
  "AI_BASE_URL",
  "AI_MODEL",
  "AI_API_KEY",
  "AI_ALLOW_NO_KEY",
  "AI_TIMEOUT_MS",
  "OPENROUTER_KEY",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
]) {
  // Include empty values to clear stale settings when switching providers.
  const result = spawnSync(
    "bunx",
    ["convex", "env", "set", name, ...(envFile ? ["--env-file", envFile] : [])],
    {
      input: values[name] || "",
      encoding: "utf8",
      env: { ...process.env, ...values },
    },
  );
  if (result.status !== 0) throw new Error(`Could not configure ${name}`);
}
console.log("AI settings configured. Secrets were not printed.");
