import { afterEach, describe, expect, it } from "vitest";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const bun = process.env
  .PATH!.split(delimiter)
  .map((dir) => join(dir, "bun"))
  .find(existsSync)!;
const temporary: string[] = [];
afterEach(() => {
  for (const dir of temporary.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "movewire-deploy-"));
  temporary.push(dir);
  for (const folder of ["scripts", "deploy", "dist", "bin"])
    mkdirSync(join(dir, folder));
  for (const name of ["deploy-local.mjs", "setup-ai.mjs", "setup-auth.mjs"])
    cpSync(resolve("scripts", name), join(dir, "scripts", name));
  cpSync(
    resolve("deploy/local.env.example"),
    join(dir, "deploy/local.env.example"),
  );
  writeFileSync(join(dir, "calls"), "");
  const env = {
    ...process.env,
    PATH: `${dir}/bin${delimiter}${process.env.PATH}`,
    CALLS: join(dir, "calls"),
  };
  const run = (
    script: string,
    args: string[] = [],
    extra: Record<string, string> = {},
  ) =>
    spawnSync(bun, [join(dir, "scripts", script), ...args], {
      cwd: dir,
      env: { ...env, ...extra },
      encoding: "utf8",
    });
  const settings = readFileSync(
    join(dir, "deploy/local.env.example"),
    "utf8",
  ).replace("AI_MODEL=", "AI_MODEL=test-model");
  return { dir, env, run, settings };
}
describe("local deployment", () => {
  it("creates settings on first run without starting services", () => {
    const f = fixture();
    expect(f.run("deploy-local.mjs").status).toBe(0);
    expect(readFileSync(join(f.dir, ".env.self-hosted"), "utf8")).toContain(
      "AI_MODEL=",
    );
    expect(readFileSync(join(f.dir, "calls"), "utf8")).toBe("");
  });
  it("rejects remote or managed targets before any command", () => {
    const f = fixture();
    for (const settings of [
      f.settings.replaceAll("http://127.0.0.1:3210", "https://example.com"),
      `${f.settings}\nCONVEX_DEPLOYMENT=prod:example\n`,
    ]) {
      writeFileSync(join(f.dir, ".env.self-hosted"), settings);
      expect(f.run("deploy-local.mjs").status).not.toBe(0);
      expect(readFileSync(join(f.dir, "calls"), "utf8")).toBe("");
    }
  });
  it("checks prerequisites without starting Docker or writing keys", () => {
    const f = fixture();
    writeFileSync(join(f.dir, ".env.self-hosted"), f.settings);
    writeFileSync(
      join(f.dir, "bin/docker"),
      '#!/bin/sh\necho "$*" >> "$CALLS"\n',
      { mode: 0o755 },
    );
    expect(f.run("deploy-local.mjs", ["--check"]).status).toBe(0);
    const calls = readFileSync(join(f.dir, "calls"), "utf8");
    expect(calls).toContain("config --quiet");
    expect(calls).not.toContain("up");
    expect(readFileSync(join(f.dir, ".env.self-hosted"), "utf8")).toBe(
      f.settings,
    );
  });
  it("keeps explicit AI settings separate from inherited cloud credentials", () => {
    const f = fixture();
    writeFileSync(join(f.dir, ".env.self-hosted"), f.settings);
    writeFileSync(
      join(f.dir, "bin/bunx"),
      '#!/bin/sh\nprintf "%s:" "$*" >> "$CALLS"\ncat >> "$CALLS"\nprintf "\\n" >> "$CALLS"\n',
      { mode: 0o755 },
    );
    const result = f.run("setup-ai.mjs", ["--env-file", ".env.self-hosted"], {
      OPENROUTER_KEY: "inherited-secret",
      AI_MODEL: "wrong-model",
    });
    expect(result.status).toBe(0);
    const calls = readFileSync(join(f.dir, "calls"), "utf8");
    expect(calls).toContain("--env-file .env.self-hosted");
    expect(calls).toContain("test-model");
    expect(calls).not.toContain("inherited-secret");
    expect(calls).not.toContain("wrong-model");
  });
});
