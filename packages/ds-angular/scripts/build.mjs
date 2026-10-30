#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "package.json"));
rmSync(resolve(root, "dist"), { recursive: true, force: true });
const compiler = resolve(dirname(require.resolve("@angular/compiler-cli/package.json")), "bundles/src/bin/ngc.js");
const result = spawnSync(process.execPath, [compiler, "-p", "tsconfig.build.json"], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await import("./build-styles.mjs");
