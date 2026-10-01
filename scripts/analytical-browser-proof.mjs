import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, openSync, closeSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const script = fileURLToPath(import.meta.url);
process.chdir(path.resolve(path.dirname(script), ".."));
const root = "tmp/analytical-browser-proof";
const renderer = "src/components/analytical/AnalyticalCompositePreview.tsx";
const mode = process.argv[2];
if (mode === "--renderer-build" || mode === "--guard-build") {
  const { build } = await import("vite");
  let injected = false;
  await build({ build: { outDir: `${root}/${mode === "--renderer-build" ? "renderer" : "guard"}`, emptyOutDir: true }, plugins: [{
    name: "analytical-proof-negative-control", enforce: "pre",
    transform(source, id) {
      if (!id.endsWith(renderer)) return;
      injected = true;
      if (mode === "--guard-build") return `${source}\nimport { CAPACITY } from "../../../packages/ds-codegen/src/analytical/projection.js"; console.log(CAPACITY);`;
      const selectedViewport = "const { x, width } = artifact.viewport;";
      if (!source.includes(selectedViewport)) throw new Error("renderer control insertion point missing");
      return source.replace(selectedViewport, `const positions = rows.flatMap(o => [o.positions[range.lower], o.positions[range.upper]]);
        const min = Math.min(...positions), span = Math.max(Math.max(...positions) - min, 1);
        const x = min - span / 8, width = span * 1.25;`);
    },
  }] });
  if (!injected) throw new Error("negative control did not reach renderer");
} else {
  mkdirSync(root, { recursive: true });
  const digest = bytes => createHash("sha256").update(bytes).digest("hex");
  const git = (...args) => {
    const result = spawnSync("git", args, { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout;
  };
  const receipt = { revision: git("rev-parse", "HEAD").trim(), status: git("status", "--short"), commands: [] };
  const diff = git("diff", "--binary", "HEAD");
  writeFileSync(`${root}/source.patch`, diff);
  receipt.diffSha256 = digest(diff);
  const sources = git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean).sort();
  writeFileSync(`${root}/source-manifest.json`, JSON.stringify(sources.map(file => ({ file, sha256: existsSync(file) ? digest(readFileSync(file)) : null })), null, 2));
  receipt.sourceManifestSha256 = digest(readFileSync(`${root}/source-manifest.json`));
  const run = (name, command, args, env = {}) => {
    const log = `${root}/${name}.log`, fd = openSync(log, "w");
    const result = spawnSync(command, args, { env: { ...process.env, FSDS_ANALYTICAL_CONTROL: "baseline", ...env }, stdio: ["ignore", fd, fd] });
    closeSync(fd);
    receipt.commands.push({ name, command: [command, ...args], exitCode: result.status, signal: result.signal, log });
    writeFileSync(`${root}/receipt.json`, JSON.stringify(receipt, null, 2));
    console.log(`${name}: exit ${result.status} (${log})`);
    if (result.error) throw result.error;
    return result.status;
  };
  const requirePass = (name, command, args) => { if (run(name, command, args) !== 0) throw new Error(`${name} failed; inspect retained log`); };
  requirePass("tokens", "pnpm", ["run", "tokens:build"]);
  requirePass("build", "pnpm", ["exec", "vite", "build", "--outDir", `${root}/baseline`, "--emptyOutDir"]);
  const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
  receipt.builtArtifacts = files(`${root}/baseline`).sort().map(file => ({ file, sha256: digest(readFileSync(file)) }));
  const config = ["exec", "playwright", "test", "--config", "playwright.analytical.config.ts"];
  requirePass("browser", "pnpm", config);
  requirePass("renderer-build", process.execPath, [script, "--renderer-build"]);
  const control = run("renderer-control", "pnpm", [...config, "--grep", "production consumer preserves Two ranges"], { FSDS_ANALYTICAL_CONTROL: "renderer" });
  const report = JSON.parse(readFileSync(`${root}/renderer-report.json`, "utf8"));
  if (control !== 1 || report.stats.unexpected !== 1 || !JSON.stringify(report.suites).includes("shared scale distance")) throw new Error("renderer defect was not rejected for shared scale distance");
  const guard = run("guard-control", process.execPath, [script, "--guard-build"]);
  if (guard !== 1 || !readFileSync(`${root}/guard-control.log`, "utf8").includes("Node analytical module entered the browser bundle")) throw new Error("forbidden import was not rejected by the browser boundary guard");
  receipt.result = "baseline passed; renderer and forbidden-import controls rejected";
  receipt.evidence = files(root).filter(file => /\.(png|json|zip)$/.test(file) && !file.endsWith("receipt.json")).sort().map(file => ({ file, sha256: digest(readFileSync(file)) }));
  writeFileSync(`${root}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(receipt.result);
}
