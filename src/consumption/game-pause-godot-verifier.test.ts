// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const verifier = fileURLToPath(new URL("../../examples/game-pause-menu/godot/scripts/verify-godot.mjs", import.meta.url));
const lane = dirname(dirname(verifier));
const passing = "TEST_PASS first\nTEST_PASS second\nTESTS_TOTAL 2\nTESTS_PASSED 2\nTESTS_FAILED 0\nTESTS_OK\n";
const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

function run({ output = passing, stderr = "", status = 0, timeout = "5000", hang = false } = {}) {
  const fixture = mkdtempSync(join(tmpdir(), "pause-godot-verifier-"));
  fixtures.push(fixture);
  const editor = join(fixture, "fake godot.cjs");
  const observation = join(fixture, "arguments.json");
  writeFileSync(editor, `#!/usr/bin/env node
const fs = require("node:fs");
fs.writeFileSync(process.env.FAKE_GODOT_OBSERVATION, JSON.stringify(process.argv.slice(2)));
function finish() {
  process.stdout.write(process.env.FAKE_GODOT_OUTPUT);
  process.stderr.write(process.env.FAKE_GODOT_STDERR);
  process.exit(Number(process.env.FAKE_GODOT_STATUS));
}
// A missing helper timeout must fail the assertion without leaving an orphan.
if (process.env.FAKE_GODOT_HANG === "1") setTimeout(finish, 1500); else finish();
`, { mode: 0o755 });
  const result = spawnSync(process.execPath, [verifier], {
    cwd: fixture,
    env: {
      ...process.env,
      GODOT: editor,
      FSDS_PAUSE_GODOT_TIMEOUT_MS: timeout,
      FAKE_GODOT_OBSERVATION: observation,
      FAKE_GODOT_OUTPUT: output,
      FAKE_GODOT_STDERR: stderr,
      FAKE_GODOT_STATUS: String(status),
      FAKE_GODOT_HANG: hang ? "1" : "0",
    },
    encoding: "utf8",
    timeout: 10_000,
    killSignal: "SIGKILL",
  });
  return { result, observation };
}

describe("Godot pause-menu external test verifier", () => {
  it("accepts real marker shape and intentional generic fixture errors through the executable override", () => {
    const { result, observation } = run({ stderr: "ERROR: PARITY_FIXTURE missing expected key (intentional fixture negative)\n" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Godot verification passed: 2 checks, zero failures.");
    expect(result.stderr).toContain("ERROR: PARITY_FIXTURE");
    expect(JSON.parse(readFileSync(observation, "utf8"))).toEqual(["--headless", "--path", lane, "res://tests/test_main.tscn"]);
  });

  it.each([
    ["zero checks", "TESTS_TOTAL 0\nTESTS_PASSED 0\nTESTS_FAILED 0\nTESTS_OK\n", "nonzero, consistent"],
    ["missing total", passing.replace("TESTS_TOTAL 2\n", ""), "expected one TESTS_TOTAL counter"],
    ["missing passed", passing.replace("TESTS_PASSED 2\n", ""), "expected one TESTS_PASSED counter"],
    ["missing failed", passing.replace("TESTS_FAILED 0\n", ""), "expected one TESTS_FAILED counter"],
    ["duplicate summary", passing + "TESTS_TOTAL 2\n", "expected one TESTS_TOTAL counter"],
    ["invalid counter", passing.replace("TESTS_TOTAL 2", "TESTS_TOTAL many"), "invalid TESTS_TOTAL counter"],
    ["inconsistent summaries", passing.replace("TESTS_TOTAL 2", "TESTS_TOTAL 3"), "nonzero, consistent"],
    ["missing individual passes", passing.replaceAll(/TEST_PASS [^\n]+\n/g, ""), "per-check markers disagree"],
    ["unreported failure", passing + "TEST_FAIL unexpected\n", "per-check markers disagree"],
    ["missing completion", passing.replace("TESTS_OK\n", ""), "expected one TESTS_OK marker"],
    ["failed checks", passing.replace("TEST_PASS second", "TEST_FAIL second").replace("TESTS_PASSED 2", "TESTS_PASSED 1").replace("TESTS_FAILED 0", "TESTS_FAILED 1"), "nonzero, consistent"],
  ])("rejects %s", (_name, output, diagnostic) => {
    const { result } = run({ output });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
    expect(result.stdout).not.toContain("Godot verification passed:");
  });

  it.each(["SCRIPT ERROR: Invalid call\n", "Parse Error: Unexpected token\n", "parse-error: missing expression\n"])("rejects successful process output containing %s", (stderr) => {
    const { result } = run({ stderr });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("script/parse error output");
  });

  it("rejects a failing process even with passing markers", () => {
    const { result } = run({ status: 3 });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spawned process exited 3");
  });

  it.each(["0", "-1", "NaN", "1.5"])("rejects invalid timeout %s before launching the executable", (timeout) => {
    const { result, observation } = run({ timeout });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must be a positive integer");
    expect(existsSync(observation)).toBe(false);
  });

  it("times out and reaps only its own spawned process", () => {
    const sibling = spawn(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], { stdio: "ignore" });
    try {
      expect(sibling.pid).toBeTypeOf("number");
      if (sibling.pid === undefined) throw new Error("fixture sibling did not start");
      const { result } = run({ timeout: "50", hang: true });
      expect(result.status).toBe(1);
      const timedOut = result.stderr.match(/spawned process ([0-9]+) timed out after 50ms/);
      expect(timedOut).not.toBeNull();
      if (timedOut === null) throw new Error("missing timeout identity");
      const terminatedPid = Number(timedOut[1]);
      expect(terminatedPid).toBeGreaterThan(0);
      expect(terminatedPid).not.toBe(sibling.pid);
      expect(() => process.kill(terminatedPid, 0)).toThrow();
      expect(process.kill(sibling.pid, 0)).toBe(true);
    } finally {
      sibling.kill("SIGKILL");
    }
  });
});
