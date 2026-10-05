import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

const values = {};
for (const file of [".env"]) {
  if (existsSync(file)) Object.assign(values, parseEnv(readFileSync(file, "utf8")));
}
const key = values.OPENROUTER_KEY || values.OPENROUTER_API_KEY;
if (!key) throw new Error("Add OPENROUTER_KEY to .env");
const result = spawnSync("bunx", ["convex", "env", "set", "OPENROUTER_KEY"], {
  input: key, encoding: "utf8",
});
if (result.status !== 0) throw new Error("Could not configure OpenRouter on Convex");
console.log("OpenRouter key configured on the development deployment.");
