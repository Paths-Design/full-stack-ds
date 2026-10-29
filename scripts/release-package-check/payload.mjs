import assert from "node:assert/strict";

const PACKAGES = new Set(["react", "vue", "svelte", "angular", "lit", "react-native", "tokens", "iconography"].map(name => `@full-stack-ds/${name}`));
const text = value => Buffer.isBuffer(value) ? value.toString("utf8") : value;
const normalized = value => text(value).replace(/\r\n/g, "\n").trimEnd();
const requireThat = (condition, code, message) => assert.ok(condition, `${code}: ${message}`);
const safePath = value => typeof value === "string" && value.length > 0 && !value.startsWith("/") && !value.includes("\\") && !/%(?:2f|5c)/i.test(value) && value.split("/").every(part => part && part !== "." && part !== ".." && part !== "node_modules");

function targets(value, output = []) {
  if (value === null) return output;
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) for (const item of value) targets(item, output);
  else {
    requireThat(value && typeof value === "object", "EXPORT_SHAPE", "export conditions must contain strings, objects, arrays, or null");
    for (const item of Object.values(value)) targets(item, output);
  }
  return output;
}

/** Checks regular-file bytes against policy captured from the source tree. */
export function assertReleasePayload({ manifest, files, expected }) {
  const entries = files instanceof Map ? files : new Map(Object.entries(files));
  requireThat(PACKAGES.has(manifest.name) && manifest.name === expected.name, "PACKAGE_NAME", "unexpected package name");
  requireThat(manifest.version === expected.version, "PACKAGE_VERSION", `expected unchanged version ${expected.version}`);
  requireThat(manifest.private === undefined || manifest.private === false, "PACKAGE_PRIVATE", "release package is private");
  requireThat(manifest.license === "MIT", "PACKAGE_LICENSE", "SPDX license must be MIT");
  requireThat((typeof manifest.author === "string" ? manifest.author : manifest.author?.name) === "DesignPaths, LLC", "PACKAGE_AUTHOR", "owner metadata differs");
  requireThat(manifest.publishConfig?.access === "public", "PACKAGE_ACCESS", "scoped package must declare public access");
  requireThat(manifest.repository?.type === "git" && manifest.repository.url === "git+https://github.com/Paths-Design/full-stack-ds.git" && manifest.repository.directory === expected.directory, "PACKAGE_REPOSITORY", "repository coordinates differ");
  requireThat(typeof manifest.description === "string" && manifest.description.trim().length > 0, "PACKAGE_DESCRIPTION", "description missing");
  requireThat(typeof manifest.homepage === "string" && /^https:\/\/github\.com\/Paths-Design\/full-stack-ds(?:$|[/#])/.test(manifest.homepage), "PACKAGE_HOMEPAGE", "homepage missing or unexpected");
  requireThat((typeof manifest.bugs === "string" ? manifest.bugs : manifest.bugs?.url) === "https://github.com/Paths-Design/full-stack-ds/issues", "PACKAGE_BUGS", "issue URL differs");
  requireThat(Array.isArray(manifest.files) && manifest.files.length > 0, "PACKAGE_FILES", "explicit payload allowlist missing");

  const leaked = /(^|\/)(?:__tests__|__mocks__|fixtures|coverage)(?:\/|$)|(?:^|\/)[^/]*\.(?:test|spec)\.[^/]+$|(?:^|\/)(?:test-setup|test-react-native(?:-svg)?|vitest\.config|jest\.config)(?:\.|$)|(?:^|\/)composed\.tokens\.json$/i;
  for (const [name, value] of entries) {
    requireThat(safePath(name), "PAYLOAD_PATH", `unsafe archive file ${name}`);
    requireThat(typeof value === "string" || Buffer.isBuffer(value), "PAYLOAD_BYTES", `missing file bytes for ${name}`);
    requireThat(!leaked.test(name), "PAYLOAD_LEAK", `test, mock, fixture, or scratch file packed: ${name}`);
  }
  requireThat(entries.has("package.json"), "PACKAGE_MANIFEST", "packed manifest bytes missing");
  assert.deepEqual(JSON.parse(text(entries.get("package.json"))), manifest, "PACKAGE_MANIFEST: caller manifest differs from packed bytes");
  requireThat(typeof expected.licenseText === "string" && expected.licenseText.length > 0, "LICENSE_POLICY", "source MIT license text required");
  requireThat(entries.has("LICENSE") && normalized(entries.get("LICENSE")) === normalized(expected.licenseText), "LICENSE_CONTENT", "packed LICENSE differs from source license");
  requireThat(entries.has("README.md") && text(entries.get("README.md")).trim().length > 0, "README_CONTENT", "package README missing or empty");
  if (expected.noticeText !== undefined) requireThat(entries.has("THIRD_PARTY_NOTICES") && normalized(entries.get("THIRD_PARTY_NOTICES")) === normalized(expected.noticeText), "NOTICE_CONTENT", "third-party notices missing or altered");
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies", "devDependencies"]) {
    for (const [name, version] of Object.entries(manifest[field] ?? {})) requireThat(typeof version === "string" && !/^(?:workspace|link|file):/.test(version.trim()), "LOCAL_DEPENDENCY", `${field}.${name} is not registry-resolvable`);
  }
  for (const [name, version] of Object.entries(expected.dependencies ?? {})) requireThat(manifest.dependencies?.[name] === version, "DEPENDENCY_VERSION", `packed dependency ${name} must be ${version}`);

  requireThat(manifest.exports && typeof manifest.exports === "object" && !Array.isArray(manifest.exports), "EXPORT_SHAPE", "explicit exports map required");
  const exportMap = Object.keys(manifest.exports).some(key => key.startsWith(".")) ? manifest.exports : { ".": manifest.exports };
  const referenced = new Set();
  function requireTarget(target) {
    requireThat(target.startsWith("./") && safePath(target.slice(2)), "EXPORT_PATH", `unsafe export target ${target}`);
    const file = target.slice(2);
    requireThat(entries.has(file), "EXPORT_MISSING", `export target missing: ${target}`);
    referenced.add(file);
  }
  for (const [key, value] of Object.entries(exportMap)) {
    requireThat(key === "." || (key.startsWith("./") && safePath(key.slice(2))), "EXPORT_KEY", `unsupported export key ${key}`);
    requireThat((key.match(/\*/g) ?? []).length <= 1, "EXPORT_KEY", `multiple wildcards in ${key}`);
    const leaves = targets(value);
    if (value !== null) requireThat(leaves.length > 0, "EXPORT_EMPTY", `no targets in ${key}`);
    for (const target of leaves) {
      requireThat(target.startsWith("./") && safePath(target.slice(2)), "EXPORT_PATH", `unsafe export target ${target}`);
      const stars = (target.match(/\*/g) ?? []).length;
      requireThat(stars <= 1 && (!stars || key.includes("*")), "EXPORT_PATTERN", `unsupported target pattern ${target}`);
      if (stars) {
        const [before, after] = target.slice(2).split("*");
        const matches = [...entries.keys()].filter(file => file.startsWith(before) && file.endsWith(after) && file.length >= before.length + after.length);
        requireThat(matches.length > 0, "EXPORT_WILDCARD_EMPTY", `no packed files match ${target}`);
        for (const file of matches) referenced.add(file);
      } else requireTarget(target);
    }
    if (key.includes("*") && value !== null) {
      const witnesses = expected.wildcardWitnesses?.[key];
      requireThat(Array.isArray(witnesses) && witnesses.length > 0, "EXPORT_WITNESSES", `source-derived substitutions required for ${key}`);
      for (const substitution of witnesses) {
        requireThat(safePath(substitution) && !substitution.includes("*"), "EXPORT_WITNESS", `unsafe substitution for ${key}`);
        for (const target of leaves) requireTarget(target.replace("*", substitution));
      }
    }
    if (key.endsWith(".css")) {
      requireThat(value && typeof value === "object" && !Array.isArray(value) && typeof value.types === "string" && Object.keys(value)[0] === "types", "CSS_TYPES", `typed CSS export required for ${key}`);
      requireThat(/\.d\.(?:ts|mts|cts)$/.test(value.types), "CSS_TYPES", `CSS type target must be a declaration for ${key}`);
    }
  }
  for (const key of expected.requiredExports ?? []) requireThat(Object.hasOwn(exportMap, key) && exportMap[key] !== null, "EXPORT_REQUIRED", `required export missing: ${key}`);
  for (const file of expected.requiredFiles ?? []) requireThat(safePath(file) && entries.has(file), "PAYLOAD_REQUIRED", `required generated payload missing: ${file}`);
  for (const field of ["main", "module", "types", "svelte"]) if (manifest[field] !== undefined) {
    requireThat(typeof manifest[field] === "string", "EXPORT_PATH", `${field} must be a path string`);
    requireTarget(manifest[field].startsWith("./") ? manifest[field] : `./${manifest[field]}`);
  }
  return { name: manifest.name, version: manifest.version, files: entries.size, referencedFiles: referenced.size };
}
