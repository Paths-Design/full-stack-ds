import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

/** Both Node entry formats load the same ESM implementation and module state. */
export function emitCommonjsFacades(packageDirectory) {
  const root = resolve(packageDirectory);
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.equal(manifest.type, "module", "CommonJS facades require a module package");
  const plans = [];
  const destinations = new Set();
  for (const [entry, conditions] of Object.entries(manifest.exports ?? {})) {
    if (!conditions || typeof conditions !== "object" || Array.isArray(conditions)) continue;
    if (!("import" in conditions) && !("require" in conditions)) continue;
    for (const [condition, extension] of [["import", ".js"], ["require", ".cjs"]]) {
      const target = conditions[condition];
      assert.ok(typeof target === "string" && target.startsWith("./") && target.endsWith(extension) &&
        !target.includes("\\") && !target.slice(2).split("/").some(part => !part || part === "." || part === ".." || part.includes("*")),
      `${entry}: expected a concrete package-relative ${condition} ${extension} target`);
    }
    const source = resolve(root, conditions.import);
    const destination = resolve(root, conditions.require);
    assert.ok(existsSync(source), `${entry}: ESM implementation is missing: ${conditions.import}`);
    assert.ok(!destinations.has(destination), `${entry}: duplicate CommonJS destination`);
    destinations.add(destination);
    let specifier = relative(dirname(destination), source).split(sep).join("/");
    if (!specifier.startsWith(".")) specifier = "./" + specifier;
    plans.push({ destination, contents: '"use strict";\n// Node >=22.19: share the canonical ESM implementation.\nmodule.exports = require(' + JSON.stringify(specifier) + ");\n" });
  }
  assert.ok(plans.length > 0, "No paired ESM/CommonJS public entries found");
  // Validate the complete manifest before replacing any public facade.
  for (const plan of plans) writeFileSync(plan.destination, plan.contents);
  return plans.map(plan => plan.destination);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  assert.ok(process.argv[2], "Usage: node emit-commonjs-facades.mjs <package-directory>");
  for (const file of emitCommonjsFacades(process.argv[2])) console.log("CommonJS facade: " + file);
}
