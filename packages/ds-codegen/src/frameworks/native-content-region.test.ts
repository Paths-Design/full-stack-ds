import { describe, expect, it } from "vitest";
import { corpusIR } from "./corpus-fixtures.js";
import { parseBindingExpression, type ComponentIR } from "../ir.js";
import { generateSwiftUIComponentSource } from "./swift/swiftui/component-source.js";
import { generateJetpackComposeComponentSource } from "./jetpack-compose/component-source.js";

function region(message = true, fallback = false, name = "class"): ComponentIR {
  const ir = structuredClone(corpusIR("Table"));
  ir.name = "ContentPanel";
  ir.messages = ir.messages.map(item => ({ ...item, catalogKey: `ContentPanel.${item.key}` }));
  const label = ir.styledProps.find(prop => prop.name === "contentLabel")!;
  label.name = name;
  label.safeName = name;
  ir.dom!.bindings["aria-label"] = parseBindingExpression(`prop:${name}`);
  if (!message) {
    delete label.defaultMessage;
    delete label.defaultExpr;
    ir.messages = [];
  }
  if (fallback) {
    ir.dom!.children.push({
      ...structuredClone(ir.dom!),
      tag: "span", part: "fallback", children: [], attrs: {}, bindings: {}, propertyBindings: {}, events: {},
      content: parseBindingExpression("prop:text"), ifProp: "children", ifNegated: true,
    });
  }
  return ir;
}

describe("native named content regions", () => {
  it("renders the Table catalog label without merging or clearing consumer controls", () => {
    const swift = generateSwiftUIComponentSource(corpusIR("Table"));
    const compose = generateJetpackComposeComponentSource(corpusIR("Table"));
    expect(swift).toContain('contentLabelProp ?? fsdsMessages.string("Table.content", default: "Table content")');
    expect(swift).toContain('@Environment(\\.fsdsMessages) private var fsdsMessages');
    expect(swift).toContain(".accessibilityElement(children: .contain)");
    expect(swift).toContain(".accessibilityLabel(SwiftUI.Text(verbatim: `contentLabel`))");
    expect(swift).not.toContain("children: .combine");
    expect(compose).toContain('contentLabel: String = LocalFsdsMessages.current.string("Table.content", "Table content"),');
    expect(compose).toContain("import com.fullstackds.messages.LocalFsdsMessages");
    expect(compose).toContain(".semantics(mergeDescendants = false) { contentDescription = contentLabel }");
    expect(compose).toContain("{ content() }");
    expect(compose).not.toContain("clearAndSetSemantics");
  });

  it("keeps catalog identity separate from keyword syntax and forwards Swift fallback overrides", () => {
    const ir = region(true, true);
    const swift = generateSwiftUIComponentSource(ir);
    // Compose routes literal fallback content through its prop-text archetype;
    // its static-region keyword case has no literal fallback leaf.
    const compose = generateJetpackComposeComponentSource(region());
    expect(swift).toContain('private var `class`: String { classProp ?? fsdsMessages.string("ContentPanel.content", default: "Table content") }');
    expect(swift).toContain("`class`: String? = nil,");
    expect(swift).toContain("self.classProp = `class`");
    expect(swift).toContain("self.init(`class`: `class`) { SwiftUI.Text(verbatim: text) }");
    expect(swift).toContain(".accessibilityLabel(SwiftUI.Text(verbatim: `class`))");
    expect(compose).toContain('`class`: String = LocalFsdsMessages.current.string("ContentPanel.content", "Table content"),');
    expect(compose).toContain("contentDescription = `class`");
  });

  it("does not create a named group from an absent nullable label", () => {
    const ir = region(false);
    const swift = generateSwiftUIComponentSource(ir);
    const compose = generateJetpackComposeComponentSource(ir);
    expect(swift).toContain("if let fsdsRegionLabel = `class` {");
    expect(swift).toContain(".accessibilityLabel(SwiftUI.Text(verbatim: fsdsRegionLabel))");
    expect(swift).toContain("} else {");
    expect(swift).not.toContain('?? ""');
    expect(compose).toContain("`class`: String? = null,");
    expect(compose).toContain("if (`class` != null) Modifier.semantics(mergeDescendants = false) { contentDescription = `class` } else Modifier");
  });

  it.each(["let", "var", "struct", "func", "enum", "protocol"])("quotes declaration keyword %s in message, nullable, and fallback forms", name => {
    const message = generateSwiftUIComponentSource(region(true, true, name));
    const nullable = generateSwiftUIComponentSource(region(false, false, name));
    expect(message).toContain(`private var \`${name}\`: String { ${name}Prop ?? fsdsMessages.string("ContentPanel.content", default: "Table content") }`);
    expect(message).toContain(`\`${name}\`: String? = nil,`);
    expect(message).toContain(`self.${name}Prop = \`${name}\``);
    expect(message).toContain(`self.init(\`${name}\`: \`${name}\`) { SwiftUI.Text(verbatim: text) }`);
    expect(nullable).toContain(`private let \`${name}\`: String?`);
    expect(nullable).toContain(`if let fsdsRegionLabel = \`${name}\` {`);
  });

  it.each(["hidden", "dynamic-role", "non-region", "conditional-content", "hidden-attribute", "hidden-binding"])("does not expose %s content as a named region", kind => {
    const ir = region();
    if (kind === "hidden") ir.dom!.bindings["aria-hidden"] = parseBindingExpression("prop:responsive");
    if (kind === "dynamic-role") ir.dom!.bindings.role = parseBindingExpression("prop:contentLabel");
    if (kind === "non-region") ir.dom!.attrs.role = "presentation";
    if (kind === "conditional-content") ir.dom!.ifProp = "responsive";
    if (kind === "hidden-attribute") ir.dom!.attrs.hidden = "";
    if (kind === "hidden-binding") ir.dom!.bindings.hidden = parseBindingExpression("prop:responsive");
    expect(generateSwiftUIComponentSource(ir)).not.toContain(".accessibilityElement(children: .contain)");
    expect(generateJetpackComposeComponentSource(ir)).not.toContain("contentDescription");
  });

  it("leaves the decorative Skeleton boundary intact", () => {
    expect(generateSwiftUIComponentSource(corpusIR("Skeleton"))).not.toContain(".accessibilityElement(children: .contain)");
    expect(generateJetpackComposeComponentSource(corpusIR("Skeleton"))).not.toContain("contentDescription");
  });
});
