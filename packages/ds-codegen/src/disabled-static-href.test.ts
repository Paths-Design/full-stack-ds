import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR } from "./ir.js";
import { generateReactComponentSource } from "./frameworks/react/component-source.js";
import { generateVueComponentSource } from "./frameworks/vue/component-source.js";
import { generateSvelteComponentSource } from "./frameworks/svelte/component-source.js";
import { generateAngularComponentSource } from "./frameworks/angular/component-source.js";
import { generateLitComponentSource } from "./frameworks/lit/component-source.js";

const uri = 'https://example.test/path?q="double"&owner=\'single\'&entity=&quot;&slash=\\tail&tick=`&value=${notAnExpression}';
const vueCompiler = createRequire(resolve(__dirname, "../../ds-vue/package.json"))("@vue/compiler-sfc");
const svelteCompiler = createRequire(resolve(__dirname, "../../ds-svelte/package.json"))("svelte/compiler");
const angularRequire = createRequire(resolve(__dirname, "../../ds-angular/package.json"));
const angularCompiler = import(/* @vite-ignore */ pathToFileURL(angularRequire.resolve("@angular/compiler")).href);

function fixture(destination = uri): ComponentContract {
  const contract = JSON.parse(readFileSync(resolve(__dirname, "../../ds-contracts/components/Links/Links.contract.json"), "utf8"));
  contract.name = "StaticDestinationProbe";
  contract.anatomy.dom.attrs.href = destination;
  delete contract.anatomy.dom.bindings.href;
  return contract;
}

function findObject(root: unknown, matches: (node: Record<string, unknown>) => boolean): Record<string, unknown> {
  const seen = new Set<object>();
  function visit(value: unknown): Record<string, unknown> | undefined {
    if (value === null || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    const node = value as Record<string, unknown>;
    if (matches(node)) return node;
    for (const child of Object.values(node)) {
      const found = visit(child);
      if (found) return found;
    }
  }
  const found = visit(root);
  expect(found, "compiler AST must contain the guarded href binding").toBeDefined();
  return found!;
}

function typescriptSource(source: string, jsx = false): ts.SourceFile {
  const parsed = ts.createSourceFile(jsx ? "probe.tsx" : "probe.ts", source, ts.ScriptTarget.Latest, true, jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  expect((parsed as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))).toEqual([]);
  return parsed;
}

function typescriptHref(source: string, jsx = false): string {
  const parsed = typescriptSource(source, jsx);
  let href: ts.ConditionalExpression | undefined;
  function visit(node: ts.Node): void {
    if (ts.isConditionalExpression(node) && ts.isCallExpression(node.condition) && node.condition.expression.getText(parsed) === "isActivationDisabled") href = node;
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  expect(href, "TypeScript AST must contain the href conditional").toBeDefined();
  expect(ts.isStringLiteral(href!.whenFalse)).toBe(true);
  expect((href!.whenFalse as ts.StringLiteral).text).toBe(uri);
  return href!.getText(parsed);
}

function assertJavaScriptDestination(expression: string, receiver = false): void {
  const evaluate = new Function("disabled", "props", "_ctx", "isActivationDisabled", `return (${expression});`);
  for (const disabled of [true, false, undefined]) {
    const context = { disabled, props: { disabled }, isActivationDisabled: (value: unknown) => value === true };
    expect(evaluate.call(receiver ? context : undefined, disabled, context.props, context, context.isActivationDisabled)).toBe(disabled === true ? undefined : uri);
  }
}

describe("static disabled href survives framework grammar layers", () => {
  it("React preserves the exact literal and omits only its disabled branch", () => {
    const source = generateReactComponentSource(buildComponentIR(fixture()), "../../primitives/stack");
    assertJavaScriptDestination(typescriptHref(source, true));
  });

  it("Vue parses the SFC and preserves the exact expression value after HTML attribute decoding", () => {
    const source = generateVueComponentSource(buildComponentIR(fixture()));
    const parsed = vueCompiler.parse(source);
    expect(parsed.errors).toEqual([]);
    const compiled = vueCompiler.compileTemplate({ source: parsed.descriptor.template.content, filename: "Probe.vue", id: "static-href" });
    expect(compiled.errors).toEqual([]);
    const directive = findObject(compiled.ast, node => node.type === 7 && node.name === "bind" && (node.arg as { content?: string })?.content === "href");
    // Vue prefixes identifiers by turning this into a compound expression;
    // evaluate the compiler's expression nodes, not the original source text.
    function expressionText(node: string | { content?: string; children?: unknown[] }): string {
      if (typeof node === "string") return node;
      if (node.content !== undefined) return node.content;
      expect(node.children).toBeDefined();
      return node.children!.map(child => expressionText(child as Parameters<typeof expressionText>[0])).join("");
    }
    const expression = expressionText(directive.exp as Parameters<typeof expressionText>[0]);
    assertJavaScriptDestination(expression);
  });

  it("Svelte parses the component and preserves the exact expression value", () => {
    const source = generateSvelteComponentSource(buildComponentIR(fixture()));
    expect(() => svelteCompiler.compile(source, { generate: false })).not.toThrow();
    const parsed = svelteCompiler.parse(source, { modern: true });
    const attribute = findObject(parsed.fragment, node => node.type === "Attribute" && node.name === "href");
    const expression = findObject(attribute.value, node => node.type === "ConditionalExpression");
    expect((expression.alternate as { value: string }).value).toBe(uri);
    assertJavaScriptDestination(source.slice(expression.start as number, expression.end as number));
  });

  it("Angular cooks the TypeScript decorator before parsing the template and exact literal branches", async () => {
    const source = generateAngularComponentSource(buildComponentIR(fixture()));
    const parsed = typescriptSource(source);
    let template: string | undefined;
    function visit(node: ts.Node): void {
      if (ts.isPropertyAssignment(node) && node.name.getText(parsed) === "template") {
        expect(ts.isNoSubstitutionTemplateLiteral(node.initializer)).toBe(true);
        template = (node.initializer as ts.NoSubstitutionTemplateLiteral).text;
      }
      ts.forEachChild(node, visit);
    }
    visit(parsed);
    expect(template).toBeDefined();
    const compiler = await angularCompiler;
    const compiled = compiler.parseTemplate(template!, "Probe.html");
    expect(compiled.errors ?? []).toEqual([]);
    const binding = findObject(compiled.nodes, node => node.constructor.name === "BoundAttribute" && node.name === "href");
    const conditional = (binding.value as { ast: { constructor: { name: string }; trueExp: { value: unknown }; falseExp: { value: unknown }; condition: { receiver: { name: string }; args: { name: string }[] } } }).ast;
    expect(conditional.constructor.name).toBe("Conditional");
    expect(conditional.condition.receiver.name).toBe("isActivationDisabled");
    expect(conditional.condition.args.map(argument => argument.name)).toEqual(["disabled"]);
    expect(conditional.trueExp.value).toBeNull();
    expect(conditional.falseExp.value).toBe(uri);
    for (const disabled of [true, false, undefined]) {
      expect(disabled === true ? conditional.trueExp.value : conditional.falseExp.value).toBe(disabled === true ? null : uri);
    }
  });

  it("Lit preserves the exact TypeScript literal inside its template expression", () => {
    const source = generateLitComponentSource(buildComponentIR(fixture()));
    assertJavaScriptDestination(typescriptHref(source), true);
  });
});
