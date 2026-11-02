import { describe, expect, it } from "vitest";
import ts from "typescript";
import { buildComponentIR } from "./ir.js";
import { emitCss, emitLitInlineCss } from "./css.js";
import { cssStringHelperSource } from "./projected-collection.js";
import { loadCorpusContract } from "./frameworks/corpus-fixtures.js";
import { generateReactComponentSource } from "./frameworks/react/component-source.js";
import { generateVueComponentSource } from "./frameworks/vue/component-source.js";
import { generateSvelteComponentSource } from "./frameworks/svelte/component-source.js";
import { generateAngularComponentSource } from "./frameworks/angular/component-source.js";
import { generateLitComponentSource } from "./frameworks/lit/component-source.js";
import { generateReactNativeComponentSource } from "./frameworks/react-native/component-source.js";
import { toFigmaComponentDescriptor } from "./frameworks/figma/factory.js";
import { assertFigmaComponentDescriptorV1 } from "./frameworks/figma/descriptor.js";
import { generateSwiftUIComponentSource } from "./frameworks/swift/swiftui/component-source.js";
import { generateJetpackComposeComponentSource } from "./frameworks/jetpack-compose/component-source.js";

const fixture = () => loadCorpusContract("Breadcrumbs");
describe("authored projected collection decoration", () => {
  it("normalizes the relation without changing authored children", () => {
    const ir = buildComponentIR(fixture());
    const list = ir.dom!.children[0];
    expect(list.children.map(node => node.tag)).toEqual(["children"]);
    expect(list.projectedCollection).toEqual({ itemPart: "item", separatorPart: "separator", separator: { kind: "prop", prop: "separator" }, cssVariable: "--fsds-breadcrumbs-child-separator" });
    expect(list.cssVarBindings).toEqual([{ varName: "--fsds-breadcrumbs-child-separator", value: { kind: "prop", prop: "separator" }, format: "css-string" }]);
    expect(ir.compoundParts.find(part => part.name === "item")?.isProjectedCollectionItem).toBe(true);
  });
  it.each(["missing item", "interactive separator", "wrong source type", "named slot", "mixed content", "competing style"])("rejects %s", invalid => {
    const contract = fixture();
    const anatomy = contract.anatomy as NonNullable<Exclude<typeof contract.anatomy, string[]>>;
    const list = anatomy.dom!.children![0];
    if (invalid === "missing item") list.projectedCollection!.itemPart = "unknown";
    if (invalid === "interactive separator") anatomy.details!.separator.role = "trigger";
    if (invalid === "wrong source type") contract.props!.styled!.members!.find(prop => prop.name === "separator")!.type = "number";
    if (invalid === "named slot") list.children = [{ tag: "slot", name: "summary" }];
    if (invalid === "mixed content") list.children!.push({ tag: "span" });
    if (invalid === "competing style") list.cssVariableBindings = { "--fsds-breadcrumbs-child-separator": "prop:separator" };
    expect(() => buildComponentIR(contract)).toThrow(/projectedCollection/);
  });
  it("lowers a renamed component through six backends and keeps empty CSS alternative text", () => {
    const contract = JSON.parse(JSON.stringify(fixture()).replaceAll("Breadcrumbs", "Trail").replaceAll("breadcrumbs", "trail"));
    const ir = buildComponentIR(contract);
    const sources = [generateReactComponentSource(ir, "../../primitives"), generateVueComponentSource(ir), generateSvelteComponentSource(ir), generateAngularComponentSource(ir), generateLitComponentSource(ir)];
    for (const source of sources) {
      expect(source).toContain("fsdsCssString(");
      expect(source).toContain("function fsdsCssString(value: unknown): string");
      expect(source).toContain("--fsds-trail-child-separator");
    }
    expect(sources[3]).toContain('selector: "li[fsdsTrailItem], fsds-trail-item"');
    expect(sources[3]).toContain('"role": "listitem"');
    for (const css of [emitCss(ir), emitLitInlineCss(ir)]) {
      expect(css).toContain('content: var(--fsds-trail-child-separator, "") / ""');
      expect(css).toContain("slot::slotted(:nth-child(n + 2 of :not([hidden])))::before");
    }
    const native = generateReactNativeComponentSource(ir);
    expect(emitLitInlineCss(ir)).toContain(":host([hidden]) { display: none; }");
    expect(native.componentFile).toContain("renderSeparatedChildren(children, separator");
    expect(native.componentFile).toContain('separator = "/"');
    expect(native.stylesFile).toContain('flexDirection: "row"');
    expect(native.stylesFile).toContain('flexWrap: "wrap"');
    expect(native.stylesFile).toContain('alignItems: "center"');
  });
  it("carries descriptor-only Figma facts and names static-native omissions", () => {
    const ir = buildComponentIR(fixture());
    const descriptor = toFigmaComponentDescriptor(ir);
    expect(descriptor.projectedCollections).toEqual({ realization: "descriptor-only", facts: [{ containerPart: "list", itemPart: "item", separatorPart: "separator", separator: { kind: "prop", prop: "separator" } }] });
    expect(() => assertFigmaComponentDescriptorV1(descriptor)).not.toThrow();
    expect(() => assertFigmaComponentDescriptorV1({ ...descriptor, projectedCollections: { ...descriptor.projectedCollections, realization: "runtime" } })).toThrow(/descriptor-only/);
    expect(() => assertFigmaComponentDescriptorV1({ ...descriptor, projectedCollections: { realization: "descriptor-only", facts: [{ containerPart: "list", itemPart: "item", separatorPart: "separator", separator: { kind: "literal", value: "/" } }] } })).toThrow(/prop binding/);
    for (const source of [generateSwiftUIComponentSource(ir), generateJetpackComposeComponentSource(ir)]) {
      expect(source).toContain("Projected separators for list are omitted; authored item content remains consumer supplied.");
    }
    delete ir.dom!.children[0].projectedCollection;
    expect(toFigmaComponentDescriptor(ir).projectedCollections).toBeUndefined();
  });
  it("serializes every character of hostile text as a CSS string escape", () => {
    const source = cssStringHelperSource(buildComponentIR(fixture()));
    const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const serialize = new Function(javascript + "; return fsdsCssString;")() as (value: unknown) => string;
    expect(serialize('←"\\\n終')).toBe('"\\2190 \\22 \\5c \\a \\7d42 "');
    expect(serialize("" )).toBe('""');
    expect(serialize(undefined)).toBe('""');
    expect(serialize('"; color:red; /*')).not.toContain("; color:red");
  });
});
