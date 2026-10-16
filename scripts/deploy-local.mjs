import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  chmodSync,
} from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "Usage: bun run deploy:local [--check]\nDeploy MoveWire to local Docker only. --check validates without starting services.\nSettings: .env.self-hosted. Guide: docs/local-deployment.md",
  );
  process.exit(0);
}
if (args.some((arg) => arg !== "--check"))
  throw new Error("Unknown option. Use --help.");
const file = ".env.self-hosted";
const checking = args.includes("--check");
if (!existsSync(file)) {
  if (!checking) {
    writeFileSync(file, readFileSync("deploy/local.env.example"), {
      mode: 0o600,
    });
    console.log(
      `Created ${file}. Set AI_MODEL and your AI service settings, then run bun run deploy:local again.`,
    );
  } else
    console.error(`Missing ${file}. Run bun run deploy:local to create it.`);
  process.exit(checking ? 1 : 0);
}
const values = parseEnv(readFileSync(file, "utf8"));
for (const key of ["CONVEX_DEPLOYMENT", "CONVEX_DEPLOY_KEY"]) {
  if (values[key])
    throw new Error(
      `Remove ${key} from ${file}; this script only supports local Docker.`,
    );
}
for (const [key, expected] of Object.entries({
  CONVEX_SELF_HOSTED_URL: "http://127.0.0.1:3210",
  VITE_CONVEX_URL: "http://127.0.0.1:3210",
})) {
  if (values[key] !== expected)
    throw new Error(`${key} must be ${expected}. See ${file}.`);
}
if (!values.AI_MODEL?.trim()) throw new Error(`Set AI_MODEL in ${file}.`);
const aiUrl = new URL(values.AI_BASE_URL);
if (!["http:", "https:"].includes(aiUrl.protocol))
  throw new Error("AI_BASE_URL must use HTTP or HTTPS.");
if (!values.AI_API_KEY && values.AI_ALLOW_NO_KEY !== "true")
  throw new Error(
    "Set AI_API_KEY or explicitly allow a private keyless service.",
  );
const env = { ...process.env, ...values };
// Ignore managed deployment settings and origin overrides inherited from the shell.
for (const key of ["CONVEX_DEPLOYMENT", "CONVEX_DEPLOY_KEY"]) delete env[key];
Object.assign(env, {
  BIND_ADDRESS: "127.0.0.1",
  BACKEND_PORT: "3210",
  SITE_PORT: "3211",
  WEB_PORT: "8080",
  CONVEX_CLOUD_ORIGIN: "http://127.0.0.1:3210",
  CONVEX_SITE_ORIGIN: "http://127.0.0.1:3211",
});
function run(command, commandArgs, capture = false) {
  const result = spawnSync(command, commandArgs, {
    env,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${command} ${commandArgs[0] || ""} failed. Check prerequisites or service logs.`,
    );
  return result.stdout?.trim();
}
run("docker", ["compose", "version"], true);
run("docker", ["info"], true);
const compose = [
  "compose",
  "--env-file",
  file,
  "-p",
  "movewire-local",
  "-f",
  "deploy/compose.yaml",
];
run("docker", [...compose, "config", "--quiet"], true);
console.log(
  "Target: local Docker backend at http://127.0.0.1:3210 (movewire-local).",
);
if (checking) {
  console.log(
    "Settings and Docker checks passed. No services or backend settings were changed.",
  );
  process.exit(0);
}
chmodSync(file, 0o600);
run("docker", [...compose, "up", "-d", "backend"]);
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    if (
      (
        await fetch(`${values.CONVEX_SELF_HOSTED_URL}/version`, {
          signal: AbortSignal.timeout(1000),
        })
      ).ok
    ) {
      ready = true;
      break;
    }
  } catch {
    /* Retry while the container starts. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready)
  throw new Error(
    "Backend did not become ready. Run docker compose -p movewire-local -f deploy/compose.yaml logs backend.",
  );
if (!values.CONVEX_SELF_HOSTED_ADMIN_KEY) {
  const key = run(
    "docker",
    [...compose, "exec", "-T", "backend", "./generate_admin_key.sh"],
    true,
  );
  if (!key || /\s/.test(key))
    throw new Error("Unexpected admin key output; inspect the backend setup.");
  appendFileSync(file, `\nCONVEX_SELF_HOSTED_ADMIN_KEY=${key}\n`);
  env.CONVEX_SELF_HOSTED_ADMIN_KEY = key;
  console.log("Saved the local admin key privately.");
}
// Configure auth before the first push: auth.config.ts requires working signing keys.
run("bun", ["scripts/setup-auth.mjs", "--env-file", file]);
run("bun", ["scripts/setup-ai.mjs", "--env-file", file]);
run("bunx", ["convex", "dev", "--once", "--env-file", file]);
run("bun", ["run", "build"]);
// Prevent an existing public runtime override from selecting a different backend.
writeFileSync(
  "dist/deployment-config.js",
  `window.MOVEWISE_CONFIG = ${JSON.stringify({ convexUrl: values.VITE_CONVEX_URL })};\n`,
);
run("docker", [...compose, "up", "-d", "web"]);
console.log(
  "MoveWire is ready at http://127.0.0.1:8080. Create a Student account to begin.",
);
