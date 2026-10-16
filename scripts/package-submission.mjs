import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const check = spawnSync("bun", ["run", "submission:check"], {
  stdio: "inherit",
});
if (check.status !== 0) process.exit(1);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const root = `submission/movewire-${stamp}`;
mkdirSync(root, { recursive: true });
// Explicit allowlist: exclude credentials, installed packages, caches, and agent files.
const entries = [
  "README.md",
  ".env.example",
  ".gitignore",
  ".gitattributes",
  "package.json",
  "bun.lock",
  "index.html",
  "components.json",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "vitest.config.ts",
  "playwright.config.ts",
  "vercel.json",
  "src",
  "convex",
  "shared",
  "public",
  "scripts",
  "deploy",
  "tests",
  "e2e",
  "docs",
];
for (const entry of entries) {
  if (existsSync(entry)) cpSync(entry, `${root}/${entry}`, { recursive: true });
}
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = `${dir}/${item.name}`;
    return item.isDirectory() ? files(path) : [path];
  });
}
const sums = files(root)
  .sort()
  .map(
    (path) =>
      `${createHash("sha256").update(readFileSync(path)).digest("hex")}  ${path.slice(root.length + 1)}`,
  );
writeFileSync(`${root}/SHA256SUMS`, `${sums.join("\n")}\n`);
const archive = `${root}.tar.gz`;
const result = spawnSync(
  "tar",
  ["-czf", archive, "-C", "submission", root.split("/").at(-1)],
  { stdio: "inherit" },
);
if (result.status !== 0)
  throw new Error(
    "Could not build archive. The prepared folder is still available.",
  );
console.log(
  `Prepared ${archive}\nReview the files and team checklist before uploading. No submission was sent.`,
);
