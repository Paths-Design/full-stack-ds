#!/usr/bin/env node
// FSDS packages are npm-installed tarballs; peer/tool versions use the local pinned store.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, preview } from "vite";
import { chromium, expect } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const angular = join(repo, "packages/ds-angular");
const requireAngular = createRequire(join(angular, "package.json"));
const compilerRoot = dirname(requireAngular.resolve("@angular/compiler-cli/package.json"));
const requireCompiler = createRequire(join(compilerRoot, "package.json"));
const { transformAsync } = requireCompiler("@babel/core");
const { default: linker } = await import(pathToFileURL(requireAngular.resolve("@angular/compiler-cli/linker/babel")).href);
const scratch = realpathSync(mkdtempSync(join(tmpdir(), "fsds-angular-package-")));
const artifacts = join(scratch, "tarballs");
const consumer = join(scratch, "consumer");
mkdirSync(artifacts);
mkdirSync(join(consumer, "src"), { recursive: true });
console.log(`Angular packed-consumer artifacts: ${scratch}`);

function run(command, args, cwd, allowFailure = false) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed (${result.status})\n${result.stdout}\n${result.stderr}`);
  return result;
}

run("pnpm", ["--filter", "@full-stack-ds/angular", "run", "build"], repo);
function pack(directory) {
  const result = run("pnpm", ["pack", "--pack-destination", artifacts], directory);
  console.log(result.stdout.trim());
  const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  const tarball = join(artifacts, `${manifest.name.replace(/^@/, "").replaceAll("/", "-")}-${manifest.version}.tgz`);
  assert.ok(existsSync(tarball), `Missing tarball ${tarball}`);
  return tarball;
}
const angularTarball = pack(angular);
const iconTarball = pack(join(repo, "packages/ds-iconography"));
writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "angular-packed-consumer", version: "1.0.0", private: true, type: "module" }));
const installed = run("npm", ["install", "--ignore-scripts", "--legacy-peer-deps", "--offline", "--package-lock=false", "--no-audit", "--no-fund", "--cache", join(scratch, "npm-cache"), angularTarball, iconTarball], consumer);
console.log(installed.stdout.trim());
const installedAngular = join(consumer, "node_modules/@full-stack-ds/angular");
assert.equal(realpathSync(installedAngular), realpathSync(consumer) + "/node_modules/@full-stack-ds/angular", "Angular must be installed, not linked to workspace source");
assert.ok(!existsSync(join(installedAngular, "src")), "Tarball must exclude workspace sources");
const manifest = JSON.parse(readFileSync(join(installedAngular, "package.json"), "utf8"));
function checkExport(value) {
  if (typeof value === "string") assert.ok(existsSync(join(installedAngular, value)), `Missing export ${value}`);
  else for (const nested of Object.values(value)) checkExport(nested);
}
checkExport(manifest.exports);
assert.ok(readFileSync(join(installedAngular, "dist/components/Button/Button.component.d.ts"), "utf8").includes("ɵɵComponentDeclaration"));
assert.ok(readFileSync(join(installedAngular, "dist/components/Button/Button.component.js"), "utf8").includes("ɵɵngDeclareComponent"));
for (const name of ["@angular/core", "@angular/common", "@angular/platform-browser", "rxjs", "tslib"]) {
  const target = join(consumer, "node_modules", name);
  mkdirSync(dirname(target), { recursive: true });
  const resolver = name === "tslib" ? requireCompiler : requireAngular;
  symlinkSync(dirname(resolver.resolve(`${name}/package.json`)), target, "dir");
}
copyFileSync(join(here, "index.html"), join(consumer, "index.html"));
const source = readFileSync(join(here, "main.ts"), "utf8");
const main = join(consumer, "src/main.ts");
const config = join(consumer, "tsconfig.json");
writeFileSync(config, JSON.stringify({
  compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true, skipLibCheck: true, experimentalDecorators: true, useDefineForClassFields: false, types: [], rootDir: "src", outDir: "compiled", ignoreDeprecations: "6.0" },
  angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true, strictInputAccessModifiers: true, compilationMode: "full" },
  files: ["src/main.ts"],
}));
const compiler = join(compilerRoot, "bundles/src/bin/ngc.js");
writeFileSync(main, source.replace('variant="primary"', 'variant="definitely-not-a-variant"'));
const rejected = run(process.execPath, [compiler, "-p", config], consumer, true);
writeFileSync(join(scratch, "invalid-variant.log"), rejected.stdout + rejected.stderr);
assert.notEqual(rejected.status, 0, "Invalid Button variant must fail AOT template checking");
assert.match(rejected.stdout + rejected.stderr, /definitely-not-a-variant[\s\S]*not assignable|not assignable[\s\S]*definitely-not-a-variant/);
writeFileSync(main, source);
const compiled = run(process.execPath, [compiler, "-p", config], consumer);
writeFileSync(join(scratch, "consumer-aot.log"), compiled.stdout + compiled.stderr);
console.log("AOT: invalid variant rejected; typed Button consumer compiled from installed declarations");

const outputs = await build({
  configFile: false, root: consumer, logLevel: "warn",
  plugins: [{
    name: "angular-standard-linker", enforce: "pre",
    async transform(code, id) {
      if (!/\.[cm]?js$/.test(id) || !code.includes("ɵɵngDeclare")) return null;
      const result = await transformAsync(code, { filename: id, configFile: false, babelrc: false, plugins: [[linker, { linkerJitMode: false }]] });
      return { code: result.code, map: null };
    },
  }],
  build: { outDir: "dist", minify: true, sourcemap: true, write: true },
});
for (const output of Array.isArray(outputs) ? outputs : [outputs]) {
  for (const chunk of output.output) {
    if (chunk.type === "chunk") {
      assert.ok(!chunk.code.includes("ɵɵngDeclare"), "Angular linker must consume every partial declaration");
      assert.ok(!Object.keys(chunk.modules).some((id) => id.includes("@angular/compiler/")), "Browser bundle must not include the JIT compiler");
    }
  }
}
const port = Number(process.env.FSDS_ANGULAR_PACKAGE_PORT ?? 5192);
const server = await preview({ configFile: false, root: consumer, preview: { host: "127.0.0.1", port, strictPort: true }, logLevel: "warn" });
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`);
  const button = page.getByRole("button", { name: "Packed consumer action", exact: true });
  await button.waitFor();
  await page.mouse.move(0, 0);
  const style = await button.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { display: computed.display, background: computed.backgroundColor, minHeight: computed.minHeight };
  });
  assert.deepEqual(style, { display: "inline-flex", background: "rgb(18, 52, 86)", minHeight: "48px" });
  await button.click();
  await page.waitForFunction(() => document.querySelector("#click-count")?.textContent === "1");
  await page.locator("#toggle-disabled").click();
  await expect(button).toBeDisabled();
  await button.evaluate((element) => element.click());
  assert.equal(await page.locator("#click-count").textContent(), "1");
  await page.locator("#toggle-disabled").click();
  await button.click();
  await page.waitForFunction(() => document.querySelector("#click-count")?.textContent === "2");
  await page.screenshot({ path: join(scratch, "packed-button.png"), fullPage: true });
  assert.deepEqual(failures, []);
  console.log(`Browser: ${JSON.stringify(style)}; enabled clicks 0 -> 1 -> 2; disabled native activation suppressed; no page errors`);
} finally {
  await browser?.close();
  await new Promise((resolveClose, reject) => server.httpServer.close((error) => error ? reject(error) : resolveClose()));
}
console.log(`Angular packed-consumer verified: ${scratch}`);
