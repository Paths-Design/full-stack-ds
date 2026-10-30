import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";
import { normalizePackageDeclarations } from "./normalize-package-declarations.mjs";

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), "fsds-declaration-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "declaration-fixture", type: "module", types: "./dist/index.d.ts", exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } } }));
  for (const [name, contents] of Object.entries(files)) {
    const file = join(root, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, contents);
  }
  return root;
}
function diagnostics(root, source) {
  const file = join(root, "consumer.mts");
  writeFileSync(file, source);
  return ts.getPreEmitDiagnostics(ts.createProgram([file], { noEmit: true, strict: true, skipLibCheck: false, noUncheckedSideEffectImports: true, types: [], target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext }));
}

test("normalized SFC and directory declarations preserve consumer type checking", t => {
  const root = fixture(t, {
    "dist/index.d.ts": 'import "./Button.css";\nexport { default as Button } from "./Button.vue";\nexport type ButtonProps = InstanceType<typeof import("./Button.vue").default>["$props"];\nexport type { Hook } from "./hooks";\n',
    "dist/Button.vue.d.ts": 'export default class Button { readonly $props: { variant?: "primary" | "secondary" }; }\n',
    "dist/hooks/index.d.ts": 'export type Hook = "hook";\n'
  });
  const valid = 'import { Button, type ButtonProps, type Hook } from "./dist/index.js";\nconst props: ButtonProps = { variant: "primary" };\nconst hook: Hook = "hook";\n';
  assert.ok(diagnostics(root, valid).length > 0, "original declaration graph must fail NodeNext");
  const result = normalizePackageDeclarations(root);
  assert.equal(result.declarations, 3);
  assert.deepEqual(diagnostics(root, valid).map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")), []);
  const normalized = readFileSync(join(root, "dist/index.d.ts"), "utf8");
  assert.ok(normalized.includes("./Button.vue.js"));
  assert.ok(normalized.includes("./hooks/index.js"));
  assert.ok(!normalized.includes('import "./Button.css"'));
  const invalid = diagnostics(root, valid.replace('variant: "primary"', 'variant: "invalid"'));
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0].code, 2322);
  assert.match(ts.flattenDiagnosticMessageText(invalid[0].messageText, "\n"), /invalid.*not assignable/);
  assert.equal(normalizePackageDeclarations(root).changed, 0);
});

test("unresolved declarations refuse the graph before changing any file", t => {
  const original = 'export type { Value } from "./nested";\n';
  const root = fixture(t, { "dist/index.d.ts": original, "dist/nested/index.d.ts": 'export type { Value } from "./missing";\n' });
  assert.throws(() => normalizePackageDeclarations(root), /Unresolved declaration.*missing/);
  assert.equal(readFileSync(join(root, "dist/index.d.ts"), "utf8"), original);
});

test("declaration references cannot acquire source files outside emitted output", t => {
  const original = 'export type { Secret } from "../source/private";\n';
  const root = fixture(t, { "dist/index.d.ts": original, "source/private.d.ts": 'export type Secret = string;\n' });
  assert.throws(() => normalizePackageDeclarations(root), /escapes emitted output/);
  assert.equal(readFileSync(join(root, "dist/index.d.ts"), "utf8"), original);
});
