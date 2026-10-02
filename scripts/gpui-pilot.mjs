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
const hashes = {};
function hashTree(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) hashTree(filename);
    else hashes[path.relative(root, filename)] = createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
  }
}
for (const directory of ["src", "tests", "examples"]) hashTree(path.join(root, "packages/ds-gpui", directory));
for (const filename of [manifest, path.join(path.dirname(manifest), "Cargo.lock")]) {
  hashes[path.relative(root, filename)] = createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}
const report = {
  schema: "fsds.gpui-pilot.v1",
  revision: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  rustc: spawnSync("rustc", ["--version"], { encoding: "utf8" }).stdout.trim(),
  platform: `${process.platform}-${process.arch}`,
  sourceHashes: hashes,
  checks: [],
  overall: "incomplete",
  nonclaims: ["physical-input", "rendered-frames", "accessibility", "keyboard", "tokens", "cross-platform", "admission-rail-binding"],
};
const reportPath = path.join(evidenceRoot, "report.json");
for (const command of [
  ["check", "--all-targets", "--locked"],
  ["test", "--locked"],
]) {
  const args = [...command, "--manifest-path", manifest];
  console.log(`GPUI pilot: cargo ${command.join(" ")}`);
  const result = spawnSync("cargo", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const log = `${command[0]}.log`;
  fs.writeFileSync(path.join(evidenceRoot, log), `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  report.checks.push({ command: ["cargo", ...args], exitCode: result.status, log, error: result.error?.message });
  report.overall = result.error || result.status !== 0 ? "fail" : "incomplete";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.error || result.status !== 0) {
    console.error(`GPUI_PILOT_FAIL: ${reportPath}`);
    process.exit(result.status ?? 1);
  }
}
report.overall = "pass";
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(`GPUI pilot receipt: ${reportPath}`);
console.log("GPUI_PILOT_PASS: real GPUI compile and Boolean state policy; physical input, visuals, accessibility and cross-platform behavior unverified.");
