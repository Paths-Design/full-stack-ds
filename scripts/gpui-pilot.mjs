import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = path.join(root, "packages/ds-gpui/Cargo.toml");
const registry = JSON.parse(fs.readFileSync(path.join(root, "fsds.targets.json"), "utf8"));
const target = registry.targets.find(entry => entry.id === "gpui");
if (!target?.components?.length) throw new Error("GPUI_PILOT_ALLOWLIST_REQUIRED");
for (const name of target.components) {
  if (!fs.existsSync(path.join(root, `packages/ds-gpui/src/components/${name}/${name}.rs`))) throw new Error(`GPUI_PILOT_GENERATION_REQUIRED: ${name}`);
}
const evidenceRoot = path.join(root, "tmp/gpui-pilot", new Date().toISOString().replace(/[:.]/g, "-"));
fs.mkdirSync(evidenceRoot, { recursive: true });
function snapshot() {
 const hashes = {};
 function hashTree(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) hashTree(filename);
    else hashes[path.relative(root, filename)] = createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
  }
 }
 for (const directory of ["src", "tests", "examples"]) hashTree(path.join(root, "packages/ds-gpui", directory));
 for (const name of target.components) hashTree(path.join(root, "packages/ds-contracts/components", name));
 hashTree(path.join(root, "packages/ds-codegen/src"));
 hashTree(path.join(root, "packages/ds-contracts/primitives"));
 for (const filename of [manifest, path.join(path.dirname(manifest), "Cargo.lock"), ...["fsds.targets.json", "scripts/gpui-pilot.mjs", "pnpm-lock.yaml", "packages/ds-tokens/generated/composed.tokens.json", "packages/ds-tokens/generated/resolved.tokens.json"].map(file => path.join(root, file))]) {
  hashes[path.relative(root, filename)] = createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
 }
 return Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)));
}
const report = {
  schema: "fsds.gpui-native-checks.v2",
  revision: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  rustc: spawnSync("rustc", ["--version"], { encoding: "utf8" }).stdout.trim(),
  platform: `${process.platform}-${process.arch}`,
  sourceStatus: spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  components: target.components,
  sourceHashes: snapshot(),
  sourceIntegrity: "unchecked",
  checks: [],
  overall: "incomplete",
  nonclaims: ["physical-input", "rendered-frames", "full-accessibility", "all-contract-semantics", "cross-platform", "upstream-main-compatibility", "admission-rail-binding"],
};
const reportPath = path.join(evidenceRoot, "report.json");
for (const command of [
  ["check", "--all-targets", "--locked"],
  ["test", "--all-targets", "--locked"],
]) {
  const args = [...command, "--manifest-path", manifest];
  console.log(`GPUI native checks: cargo ${command.join(" ")}`);
  const result = spawnSync("cargo", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const log = `${command[0]}.log`;
  fs.writeFileSync(path.join(evidenceRoot, log), `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  const passedTests = [...(result.stdout ?? "").matchAll(/^test (.+?) \.\.\. ok$/gm)].map(match => match[1]);
  report.checks.push({ command: ["cargo", ...args], exitCode: result.status, log, passedTests, error: result.error?.message });
  report.overall = result.error || result.status !== 0 ? "fail" : "incomplete";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.error || result.status !== 0 || (command[0] === "test" && passedTests.length === 0)) {
    report.overall = "fail";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    console.error(`GPUI_PILOT_FAIL: ${reportPath}`);
    process.exit(result.status || 1);
  }
}
const after = snapshot();
report.changedInputs = [...new Set([...Object.keys(report.sourceHashes), ...Object.keys(after)])].filter(filename => report.sourceHashes[filename] !== after[filename]);
report.sourceIntegrity = report.changedInputs.length ? "changed-during-checks" : "stable";
report.overall = report.changedInputs.length ? "fail" : "pass";
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
if (report.overall !== "pass") throw new Error(`GPUI_INPUT_CHANGED: ${reportPath}`);
console.log(`GPUI native receipt: ${reportPath}`);
console.log("GPUI_NATIVE_PASS: real GPUI compilation and named Rust tests passed against stable recorded inputs. Gallery pixels and physical input require separate inspection.");
