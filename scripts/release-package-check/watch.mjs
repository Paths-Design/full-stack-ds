import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

/** Exercise the actual package watch commands in isolated copies of their source. */
export async function verifyPackageWatch({ repo, evidence }) {
  for (const name of ["react", "lit"]) {
    const root = join(evidence, "watch-" + name);
    const source = join(repo, "packages/ds-" + name);
    const directory = join(root, "packages/ds-" + name);
    mkdirSync(directory, { recursive: true });
    mkdirSync(join(root, "scripts"));
    cpSync(join(source, "src"), join(directory, "src"), { recursive: true });
    for (const file of ["package.json", "tsconfig.json", "tsup.config.ts"]) cpSync(join(source, file), join(directory, file));
    cpSync(join(repo, "scripts/emit-commonjs-facades.mjs"), join(root, "scripts/emit-commonjs-facades.mjs"));
    symlinkSync(realpathSync(join(source, "node_modules")), join(directory, "node_modules"), "dir");
    const entry = join(directory, "src/primitives/index.ts");
    const types = join(directory, "src/primitives/fsds-watch-probe.ts");
    const original = readFileSync(entry, "utf8");
    const runtime = value => original + '\nexport type { FsdsWatchTypeProbe } from "./fsds-watch-probe.js";\nexport const fsdsWatchRuntimeProbe = () => ' + JSON.stringify(value) + ';\n';
    const type = value => 'export interface FsdsWatchTypeProbe { value: ' + JSON.stringify(value) + '; }\n';
    writeFileSync(entry, runtime("runtime-initial"));
    writeFileSync(types, "export interface FsdsWatchTypeProbe { value: MissingWatchType; }\n");
    const invalidBuild = spawnSync("pnpm", ["run", "build"], { cwd: directory, encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 90000 });
    writeFileSync(join(evidence, "watch-" + name + "-invalid-build.log"), `exit: ${invalidBuild.status}\n${invalidBuild.stdout ?? ""}\n${invalidBuild.stderr ?? ""}`);
    if (invalidBuild.error) throw invalidBuild.error;
    assert.notEqual(invalidBuild.status, 0, name + ": ordinary builds must fail for invalid declarations");
    assert.match(invalidBuild.stdout + invalidBuild.stderr, /MissingWatchType/);
    assert.equal(existsSync(join(directory, "dist/index.cjs")), false);
    assert.equal(existsSync(join(directory, "dist/primitives/index.cjs")), false);
    mkdirSync(join(directory, "dist"), { recursive: true });
    writeFileSync(join(directory, "dist/stale.cjs"), "stale implementation");
    writeFileSync(join(directory, "dist/stale.d.cts"), "stale declaration");
    const child = spawn("pnpm", ["run", "build:watch"], { cwd: directory, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const log = join(evidence, "watch-" + name + ".log");
    const capture = data => { output += data.toString(); writeFileSync(log, output); };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    let launchError;
    child.on("error", error => { launchError = error; });
    const closed = new Promise(resolve => child.once("close", (code, signal) => resolve({ code, signal })));
    const observations = [];
    const waitFor = async (label, predicate) => {
      const end = Date.now() + 90000;
      while (Date.now() < end) {
        if (launchError) throw launchError;
        assert.equal(child.exitCode, null, name + ": watcher exited during " + label + "; inspect " + log);
        if (predicate()) { observations.push(label); return; }
        await setTimeout(100);
      }
      assert.fail(name + ": timed out waiting for " + label + "; inspect " + log);
    };
    const read = path => existsSync(path) ? readFileSync(path, "utf8") : "";
    const emitted = (runtimeValue, typeValue) => {
      const js = existsSync(join(directory, "dist")) ? readdirSync(join(directory, "dist"), { recursive: true })
        .filter(path => path.endsWith(".js")).map(path => read(join(directory, "dist", path))).join("\n") : "";
      const esm = read(join(directory, "dist/primitives/index.d.ts"));
      const cjs = read(join(directory, "dist/primitives/index.d.cts"));
      return js.includes(runtimeValue) && esm.includes(typeValue) && cjs.includes(typeValue) &&
        ["dist/index.cjs", "dist/primitives/index.cjs"].every(path => read(join(directory, path)).includes('module.exports = require("./index.js")'));
    };
    const checkRuntime = expected => assert.equal(execFileSync(process.execPath, ["-e",
      "process.stdout.write(require(process.argv[1]).fsdsWatchRuntimeProbe())", join(directory, "dist/primitives/index.cjs")],
    { cwd: directory, encoding: "utf8" }), expected);
    let failure;
    try {
      await waitFor("startup declaration error with live watcher and withheld facades", () => output.includes("MissingWatchType") &&
        output.includes("Watching for changes") && !existsSync(join(directory, "dist/index.cjs")) &&
        !existsSync(join(directory, "dist/primitives/index.cjs")));
      // tsup logs before its asynchronous glob scan and native watcher setup.
      await setTimeout(1000);
      writeFileSync(types, type("type-initial"));
      await waitFor("initial runtime and both declaration formats", () => emitted("runtime-initial", "type-initial"));
      checkRuntime("runtime-initial");
      assert.equal(existsSync(join(directory, "dist/stale.cjs")), false);
      assert.equal(existsSync(join(directory, "dist/stale.d.cts")), false);
      writeFileSync(types, type("type-updated"));
      await waitFor("type-only dependency edit", () => emitted("runtime-initial", "type-updated"));
      writeFileSync(entry, runtime("runtime-updated"));
      await waitFor("runtime edit", () => emitted("runtime-updated", "type-updated"));
      checkRuntime("runtime-updated");
      const offset = output.length;
      writeFileSync(types, "export interface FsdsWatchTypeProbe { value: MissingWatchType; }\n");
      await waitFor("declaration error with withheld facades", () => output.slice(offset).includes("MissingWatchType") &&
        !existsSync(join(directory, "dist/index.cjs")) && !existsSync(join(directory, "dist/primitives/index.cjs")));
      writeFileSync(types, type("type-repaired"));
      await waitFor("same watcher recovers after repair", () => emitted("runtime-updated", "type-repaired"));
      checkRuntime("runtime-updated");
    } catch (error) {
      failure = error;
    }
    try {
      if (child.pid) {
        try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
      }
      const stopped = await Promise.race([closed, setTimeout(10000, "timeout", { ref: false })]);
      assert.notEqual(stopped, "timeout", name + ": owned watcher did not stop after SIGTERM");
    } catch (error) {
      if (failure) throw new AggregateError([failure, error], name + ": watch check and cleanup failed");
      throw error;
    }
    if (failure) throw failure;
    writeFileSync(join(evidence, "watch-" + name + ".json"), JSON.stringify({ package: name, command: "pnpm run build:watch", node: process.version, observations, cleanup: "watch command closed after process-group SIGTERM", passed: true }, null, 2));
  }
}
