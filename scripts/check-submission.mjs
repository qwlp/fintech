import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const required = [
  "README.md",
  "bun.lock",
  "vitest.config.ts",
  "deploy/compose.yaml",
  "deploy/local.env.example",
  "scripts/deploy-local.mjs",
  "docs/architecture.md",
  "docs/security-self-assessment.md",
  "docs/submission-checklist.md",
  "docs/local-deployment.md",
  "docs/validation.md",
  "docs/presentation.pdf",
  "docs/source/presentation.html",
  "docs/demonstration-guide.pdf",
  "docs/source/demonstration-guide.typ",
  "docs/evidence/sandbox-execution.json",
  "docs/evidence/dependency-licenses.json",
  "docs/evidence/development-session.json",
  "docs/evidence/demo-manifest.json",
  "docs/evidence/sandbox-demo.webm",
];
const failures = [];
for (const file of required) {
  if (!existsSync(file) || statSync(file).size === 0)
    failures.push(`Missing or empty: ${file}`);
}
function markdownFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = `${folder}/${entry.name}`;
    return entry.isDirectory()
      ? markdownFiles(path)
      : entry.name.endsWith(".md")
        ? [path]
        : [];
  });
}
for (const file of ["README.md", ...markdownFiles("docs")]) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const link = match[1].split("#")[0];
    if (!link || /^[a-z]+:/i.test(link)) continue;
    if (!existsSync(resolve(dirname(file), decodeURIComponent(link))))
      failures.push(`Broken link in ${file}: ${link}`);
  }
}
if (existsSync("docs/evidence/demo-manifest.json")) {
  const manifest = JSON.parse(
    readFileSync("docs/evidence/demo-manifest.json", "utf8"),
  );
  for (const [file, expected] of Object.entries(manifest.sha256)) {
    const path = `docs/evidence/${file}`;
    if (
      existsSync(path) &&
      createHash("sha256").update(readFileSync(path)).digest("hex") !== expected
    )
      failures.push(`Evidence hash mismatch: ${path}`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `Submission files, documentation links, and recorded-demo hashes passed (${required.length} required files).`,
);
console.log(
  "Team eligibility, rights clearance, presentation timing, and actual organizer submission still need the team's review.",
);
