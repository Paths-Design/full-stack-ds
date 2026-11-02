import assert from "node:assert/strict";
import test from "node:test";
import { assertReleasePayload } from "./payload.mjs";

// Integration supplies the complete authoritative license and notices.
const licenseText = "MIT License\nCopyright (c) 2026 DesignPaths, LLC\nFixture permission text.\n";
const noticeText = "Lucide ISC attribution and permission.\nFeather MIT attribution and permission.\n";
function fixture() {
  const manifest = {
    name: "@full-stack-ds/vue", version: "0.1.0", type: "module",
    license: "MIT", author: "DesignPaths, LLC", description: "Vue component library",
    engines: { node: ">=22.19.0" },
    publishConfig: { access: "public" },
    repository: { type: "git", url: "git+https://github.com/Paths-Design/full-stack-ds.git", directory: "packages/ds-vue" },
    homepage: "https://github.com/Paths-Design/full-stack-ds/tree/main/packages/ds-vue",
    bugs: { url: "https://github.com/Paths-Design/full-stack-ds/issues" },
    files: ["dist", "LICENSE", "README.md", "THIRD_PARTY_NOTICES"],
    exports: {
      ".": { types: "./dist/index.d.ts", import: "./dist/index.js", require: "./dist/index.cjs" },
      "./styles.css": { types: "./dist/styles-css.d.ts", default: "./dist/styles.css" },
      "./assets/*": "./dist/assets/*",
    },
    main: "./dist/index.cjs", module: "./dist/index.js", types: "./dist/index.d.ts",
    dependencies: { "@full-stack-ds/iconography": "1.0.0" },
  };
  const files = new Map([
    ["LICENSE", licenseText], ["THIRD_PARTY_NOTICES", noticeText], ["README.md", "# Vue\nConsumer instructions.\n"],
    ["dist/index.d.ts", "export declare const Button: unknown;"],
    ["dist/index.js", "export const Button = {};"], ["dist/index.cjs", "exports.Button = {};"],
    ["dist/styles-css.d.ts", "export {};"], ["dist/styles.css", ".button {}"],
    ["dist/assets/first.svg", "<svg/>"], ["dist/assets/nested/second.svg", "<svg/>"],
  ]);
  return { manifest, files, expected: {
    name: manifest.name, version: "0.1.0", directory: "packages/ds-vue", licenseText, noticeText,
    dependencies: { "@full-stack-ds/iconography": "1.0.0" },
    requiredExports: [".", "./styles.css", "./assets/*"],
    requiredFiles: ["dist/assets/first.svg", "dist/assets/nested/second.svg"],
    wildcardWitnesses: { "./assets/*": ["first.svg", "nested/second.svg"] },
  } };
}
function check(payload) {
  payload.files.set("package.json", JSON.stringify(payload.manifest));
  return assertReleasePayload(payload);
}
test("accepts complete packed metadata, conditional targets, CSS and wildcard closure", () => {
  const payload = fixture();
  payload.files.set("dist/index.js", Buffer.from("export const Button = {};"));
  const result = check(payload);
  assert.equal(result.version, "0.1.0");
  assert.equal(result.referencedFiles, 7);
  assert.equal(result.files, payload.files.size);
});
test("source-derived version policy preserves mixed package versions", () => {
  const payload = fixture();
  payload.manifest.version = "1.0.0";
  assert.throws(() => check(payload), /PACKAGE_VERSION/);
  payload.expected.version = "1.0.0";
  assert.equal(check(payload).version, "1.0.0");
});
const mutations = [
  ["unknown package", "PACKAGE_NAME", p => { p.manifest.name = "@full-stack-ds/unowned"; }],
  ["private package", "PACKAGE_PRIVATE", p => { p.manifest.private = true; }],
  ["wrong SPDX", "PACKAGE_LICENSE", p => { p.manifest.license = "UNLICENSED"; }],
  ["missing Node baseline", "PACKAGE_NODE", p => { delete p.manifest.engines; }],
  ["unsupported Node floor", "PACKAGE_NODE", p => { p.manifest.engines.node = ">=18"; }],
  ["wrong owner", "PACKAGE_AUTHOR", p => { p.manifest.author = "Other Owner"; }],
  ["restricted scoped publication", "PACKAGE_ACCESS", p => { p.manifest.publishConfig.access = "restricted"; }],
  ["incorrect repository directory", "PACKAGE_REPOSITORY", p => { p.manifest.repository.directory = "packages/ds-react"; }],
  ["missing license", "LICENSE_CONTENT", p => { p.files.delete("LICENSE"); }],
  ["altered license attribution", "LICENSE_CONTENT", p => { p.files.set("LICENSE", licenseText.replace("DesignPaths, LLC", "Other Owner")); }],
  ["empty README", "README_CONTENT", p => { p.files.set("README.md", "\n"); }],
  ["missing third-party notice", "NOTICE_CONTENT", p => { p.files.delete("THIRD_PARTY_NOTICES"); }],
  ["stripped Feather notice", "NOTICE_CONTENT", p => { p.files.set("THIRD_PARTY_NOTICES", "Lucide ISC attribution and permission.\n"); }],
  ["missing CJS target despite valid ESM", "EXPORT_MISSING", p => { p.files.delete("dist/index.cjs"); }],
  ["missing type target despite valid runtime", "EXPORT_MISSING", p => { p.files.delete("dist/index.d.ts"); }],
  ["missing CSS target", "EXPORT_MISSING", p => { p.files.delete("dist/styles.css"); }],
  ["untyped CSS export", "CSS_TYPES", p => { p.manifest.exports["./styles.css"] = "./dist/styles.css"; }],
  ["late type condition", "CSS_TYPES", p => { p.manifest.exports["./styles.css"] = { default: "./dist/styles.css", types: "./dist/styles-css.d.ts" }; }],
  ["empty wildcard family", "EXPORT_WILDCARD_EMPTY", p => { p.files.delete("dist/assets/first.svg"); p.files.delete("dist/assets/nested/second.svg"); }],
  ["one wildcard projection missing while another survives", "EXPORT_MISSING", p => { p.files.delete("dist/assets/nested/second.svg"); }],
  ["wildcard without source-derived inventory", "EXPORT_WITNESSES", p => { delete p.expected.wildcardWitnesses; }],
  ["removed required export", "EXPORT_REQUIRED", p => { delete p.manifest.exports["./styles.css"]; }],
  ["removed independent required asset", "PAYLOAD_REQUIRED", p => { p.expected.requiredFiles.push("dist/catalog.json"); }],
  ["test fixture leak", "PAYLOAD_LEAK", p => { p.files.set("dist/components/Popover/__tests__/PopoverFixture.svelte", "<div/>"); }],
  ["compiled test leak", "PAYLOAD_LEAK", p => { p.files.set("dist/primitives/messages.test.js", "test();"); }],
  ["RN mock leak", "PAYLOAD_LEAK", p => { p.files.set("src/test-react-native-svg.tsx", "export {};"); }],
  ["token composition scratch", "PAYLOAD_LEAK", p => { p.files.set("generated/composed.tokens.json", "{}"); }],
  ["workspace dependency", "LOCAL_DEPENDENCY", p => { p.manifest.dependencies["@full-stack-ds/iconography"] = "workspace:*"; }],
  ["local optional dependency", "LOCAL_DEPENDENCY", p => { p.manifest.optionalDependencies = { external: "file:../external" }; }],
  ["incorrect rewritten workspace version", "DEPENDENCY_VERSION", p => { p.manifest.dependencies["@full-stack-ds/iconography"] = "0.1.0"; }],
  ["unsafe archive traversal", "PAYLOAD_PATH", p => { p.files.set("../escape.js", ""); }],
  ["unsafe export traversal", "EXPORT_PATH", p => { p.manifest.exports["."] = "./dist/../index.js"; }],
  ["unsupported wildcard target", "EXPORT_PATTERN", p => { p.manifest.exports["./assets/*"] = "./dist/*/*"; }],
  ["dangling legacy main", "EXPORT_MISSING", p => { p.manifest.main = "./dist/missing.cjs"; }],
];
for (const [name, code, mutate] of mutations) test(`rejects ${name} for the intended reason`, () => {
  const payload = fixture();
  mutate(payload);
  assert.throws(() => check(payload), new RegExp(`${code}:`));
});
test("does not accept a caller manifest that differs from the archive", () => {
  const payload = fixture();
  payload.files.set("package.json", JSON.stringify({ ...payload.manifest, version: "99.0.0" }));
  assert.throws(() => assertReleasePayload(payload), /PACKAGE_MANIFEST:/);
});
test("line-ending normalization preserves complete required license text", () => {
  const payload = fixture();
  payload.files.set("LICENSE", licenseText.replace(/\n/g, "\r\n"));
  assert.equal(check(payload).name, payload.manifest.name);
});
