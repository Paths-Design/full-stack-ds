// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const verifier = fileURLToPath(new URL("../../examples/game-pause-menu/unity/scripts/verify-unity.sh", import.meta.url));
const lane = dirname(dirname(verifier));
const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

const passingCases = '<test-case id="1" result="Passed"/><test-case id="2" result="Passed"/>';

function receipt(overrides: Record<string, string | undefined> = {}, cases = passingCases) {
  const attributes = { result: "Passed", total: "2", passed: "2", failed: "0", skipped: "0", inconclusive: "0", ...overrides };
  return `<test-run ${Object.entries(attributes).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}="${value}"`).join(" ")}><test-suite result="Passed">${cases}</test-suite></test-run>`;
}

function run(xml: string | undefined, { editorStatus = 0, staleReceipt = false } = {}) {
  const fixture = mkdtempSync(join(tmpdir(), "pause-unity-verifier-"));
  fixtures.push(fixture);
  const evidence = join(fixture, "isolated evidence");
  const observation = join(fixture, "editor-observation.json");
  const editor = join(fixture, "fake editor.cjs");
  mkdirSync(evidence);
  if (staleReceipt) writeFileSync(join(evidence, "editmode-results.xml"), receipt());
  // Only this fake executable is launched. The real shell entrypoint still owns
  // argument quoting, evidence cleanup, process status and XML validation.
  writeFileSync(editor, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const value = (flag) => args[args.indexOf(flag) + 1];
fs.writeFileSync(process.env.FAKE_EDITOR_OBSERVATION, JSON.stringify({ args, evidence: process.env.FSDS_PAUSE_EVIDENCE }));
fs.writeFileSync(value("-logFile"), "fake editor log\\n");
if (process.env.FAKE_EDITOR_EMIT === "1") fs.writeFileSync(value("-testResults"), process.env.FAKE_EDITOR_XML);
process.exit(Number(process.env.FAKE_EDITOR_STATUS));
`, { mode: 0o755 });
  const result = spawnSync("bash", [verifier], {
    cwd: fixture,
    env: {
      ...process.env,
      UNITY_EDITOR: editor,
      FSDS_PAUSE_EVIDENCE: evidence,
      FAKE_EDITOR_OBSERVATION: observation,
      FAKE_EDITOR_XML: xml ?? "",
      FAKE_EDITOR_EMIT: xml === undefined ? "0" : "1",
      FAKE_EDITOR_STATUS: String(editorStatus),
    },
    encoding: "utf8",
    timeout: 10_000,
  });
  return { result, evidence, observation };
}

describe("Unity pause-menu EditMode receipt verifier", () => {
  it("accepts an all-pass receipt and honors isolated editor/evidence overrides", () => {
    const { result, evidence, observation } = run(receipt());
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("EditMode lane passed: 2 tests, 0 failures, 0 skipped, 0 inconclusive.");
    expect(JSON.parse(readFileSync(observation, "utf8"))).toEqual({
      args: ["-batchmode", "-projectPath", lane, "-runTests", "-testPlatform", "EditMode", "-testResults", join(evidence, "editmode-results.xml"), "-logFile", join(evidence, "editmode.log")],
      evidence,
    });
    expect(readFileSync(join(evidence, "editmode.log"), "utf8")).toBe("fake editor log\n");
  });

  it.each([
    ["failed result", { result: "Failed", passed: "1", failed: "1" }],
    ["failed test despite Passed result", { failed: "1" }],
    ["skipped test", { total: "3", skipped: "1" }],
    ["skipped test despite matching total", { skipped: "1" }],
    ["inconclusive test", { inconclusive: "1" }],
    ["zero executed tests", { total: "0", passed: "0" }],
    ["unaccounted total", { total: "3" }],
    ["invalid counter", { passed: "many" }],
    ["missing result", { result: undefined }],
  ] satisfies [string, Record<string, string | undefined>][])("rejects %s", (_name, attributes) => {
    const { result } = run(receipt(attributes));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EditMode lane FAILED:");
    expect(result.stdout).not.toContain("EditMode lane passed:");
  });

  it.each(["total", "passed", "failed", "skipped", "inconclusive"])("rejects a missing %s counter", (field) => {
    const { result } = run(receipt({ [field]: undefined }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`missing or invalid ${field} counter`);
  });

  it.each([
    ["no", ""],
    ["too few", '<test-case result="Passed"/>'],
    ["too many", passingCases + '<test-case result="Passed"/>'],
  ])("rejects %s test-case records despite passing summary counters", (_name, cases) => {
    const { result } = run(receipt({}, cases));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("test-case record count");
    expect(result.stdout).not.toContain("EditMode lane passed:");
  });

  it.each(["Failed", "Skipped", "Inconclusive", "missing"])("rejects a %s descendant despite passing summary counters", (status) => {
    const failingCase = status === "missing" ? '<test-case/>' : `<test-case result="${status}"/>`;
    const { result } = run(receipt({}, '<test-case result="Passed"/>' + failingCase));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("test-case result");
    expect(result.stdout).not.toContain("EditMode lane passed:");
  });

  it("rejects a failed nested suite despite passing case records and summary counters", () => {
    const { result } = run(receipt().replace('<test-suite result="Passed">', '<test-suite result="Failed">'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("test-suite result");
    expect(result.stdout).not.toContain("EditMode lane passed:");
  });

  it.each([
    ["empty", ""],
    ["truncated", receipt().replace("</test-run>", "")],
    ["wrong root", receipt().replaceAll("test-run", "test-suite")],
  ])("rejects the %s receipt", (_name, xml) => {
    const { result } = run(xml);
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain("EditMode lane passed:");
  });

  it("clears a stale passing receipt when the editor emits no fresh result", () => {
    const { result, evidence } = run(undefined, { staleReceipt: true });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unity produced no test results");
    expect(existsSync(join(evidence, "editmode-results.xml"))).toBe(false);
  });

  it("rejects editor failure even when its XML claims success", () => {
    const { result } = run(receipt(), { editorStatus: 3 });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unity Editor exited 3");
    expect(result.stdout).not.toContain("EditMode lane passed:");
  });
});
