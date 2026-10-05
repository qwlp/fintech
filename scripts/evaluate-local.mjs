import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const output = join(tmpdir(), `movewise-evaluation-${process.pid}.json`);
const child = Bun.spawn(
  ["bun", "run", "test", "--reporter=json", `--outputFile=${output}`],
  {
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, EXPORT_EXECUTION_EVIDENCE: "1" },
  },
);
const exit = await child.exited;
const data = JSON.parse(await readFile(output, "utf8"));
const cases = data.testResults.flatMap((file) =>
  file.assertionResults.map((result) => ({
    suite: file.name.replace(`${process.cwd()}/`, ""),
    scenario: result.fullName,
    status: result.status,
    durationMs: result.duration ?? null,
  })),
);
const report = {
  generatedAt: new Date().toISOString(),
  environment: "Local Vitest and convex-test; external model responses mocked",
  scope:
    "Deterministic planning, payment authorization/accounting, AI dispatch and account privacy regression checks",
  notMeasured: [
    "Live model task completion",
    "Real provider settlement",
    "Student usability",
    "Independent security assurance",
  ],
  passed: cases.filter((test) => test.status === "passed").length,
  failed: cases.filter((test) => test.status === "failed").length,
  skipped: cases.filter((test) => !["passed", "failed"].includes(test.status))
    .length,
  scenarios: cases,
};
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/local-evaluation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Local checks: ${report.passed} passed, ${report.failed} failed, ${report.skipped} skipped. Report: docs/evidence/local-evaluation.json`,
);
process.exit(exit);
