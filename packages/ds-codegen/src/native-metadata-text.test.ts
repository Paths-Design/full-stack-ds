import { describe, expect, it } from "vitest";
import { buildComponentIR, type BindingExpression, type ComponentIR } from "./ir.js";
import { loadCorpusContract, corpusIR } from "./frameworks/corpus-fixtures.js";
import { metadataInput, nativeMetadataTextPlan } from "./native-metadata-text.js";
import { generateSwiftUIComponentSource } from "./frameworks/swift/swiftui/component-source.js";
import { generateJetpackComposeComponentSource } from "./frameworks/jetpack-compose/component-source.js";
import { swiftMetadataText } from "./frameworks/swift/swiftui/messages.js";
import { kotlinMetadataText } from "./frameworks/jetpack-compose/messages.js";

function bulletin(): ComponentIR {
  const contract = JSON.parse(JSON.stringify(loadCorpusContract("Postcard")).replaceAll("postcard.design.", "bulletin.design."));
  contract.name = "Bulletin";
  return buildComponentIR(contract);
}

describe("native scalar metadata projection", () => {
  it("retains exact prop/path identities and the ordered body hole under another component name", () => {
    const ir = bulletin();
    const plan = nativeMetadataTextPlan(ir)!;
    expect(plan.inputs).toEqual([
      { prop: "author", path: ["name"], name: "authorName" },
      { prop: "author", path: ["handle"], name: "authorHandle" },
      { prop: "timestamp", path: [], name: "timestamp" },
      { prop: "stats", path: ["likes"], name: "statsLikes" },
      { prop: "stats", path: ["replies"], name: "statsReplies" },
      { prop: "stats", path: ["reposts"], name: "statsReposts" },
    ]);
    expect(plan.leaves.map(leaf => leaf.kind === "content" ? "CONTENT" : leaf.source)).toEqual([
      { kind: "prop", prop: "author", path: ["name"] },
      { kind: "prop", prop: "author", path: ["handle"] },
      { kind: "prop", prop: "timestamp" },
      "CONTENT",
      ...["likes", "replies", "reposts"].map(key => ({ kind: "message", key, params: [{ name: "count", value: { kind: "prop", prop: "stats", path: [key] } }] })),
    ]);
    expect(plan.leaves[0]!.parts).toEqual(["root", "header", "userInfo", "displayName"]);
    expect(plan.label).toEqual({ kind: "message", key: "postLabel", params: [{ name: "name", value: { kind: "prop", prop: "author", path: ["name"] } }] });
  });

  it("renders every metadata lookup with the corresponding public scalar input and preserves body-only calls", () => {
    const ir = bulletin();
    const swift = generateSwiftUIComponentSource(ir);
    const kotlin = generateJetpackComposeComponentSource(ir);
    for (const input of ["authorName", "authorHandle", "timestamp", "statsLikes", "statsReplies", "statsReposts"]) {
      expect(swift).toContain(`\`${input}\`: String = "",`);
      expect(swift).toContain(`self.\`${input}\` = \`${input}\``);
      expect(kotlin).toContain(`${input}: String = "",`);
    }
    expect(swift).toContain("@ViewBuilder content: () -> Content");
    expect(kotlin).toContain("content: @Composable () -> Unit,");
    expect(swift).toContain('@Environment(\\.fsdsMessages) private var fsdsMessages');
    expect(kotlin).toContain("val fsdsMessages = LocalFsdsMessages.current");
    const swiftSites = [
      'SwiftUI.Text(verbatim: `authorName`)',
      'SwiftUI.Text(verbatim: `authorHandle`)',
      'SwiftUI.Text(verbatim: `timestamp`)',
      "\n            content\n",
      ...["likes", "replies", "reposts"].map(key => `SwiftUI.Text(verbatim: fsdsMessages.string("Bulletin.${key}", default: "${key[0]!.toUpperCase() + key.slice(1)}: {count}", params: ["count": \`stats${key[0]!.toUpperCase() + key.slice(1)}\`]))`),
    ];
    const kotlinSites = [
      "Text(text = authorName)", "Text(text = authorHandle)", "Text(text = timestamp)", "content()",
      ...["likes", "replies", "reposts"].map(key => `Text(text = fsdsMessages.string("Bulletin.${key}", "${key[0]!.toUpperCase() + key.slice(1)}: {count}", mapOf("count" to stats${key[0]!.toUpperCase() + key.slice(1)})))`),
    ];
    for (const [source, sites] of [[swift, swiftSites], [kotlin, kotlinSites]] as const) {
      const positions = sites.map(site => source.indexOf(site));
      expect(positions.every(position => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
    expect(swift).toContain('.accessibilityLabel(SwiftUI.Text(verbatim: fsdsMessages.string("Bulletin.postLabel", default: "Post by {name}", params: ["name": `authorName`])))');
    expect(kotlin).toContain('contentDescription = fsdsMessages.string("Bulletin.postLabel", "Post by {name}", mapOf("name" to authorName))');
    expect(swift).not.toMatch(/private let (?:author|stats|embed):/);
    expect(kotlin).not.toMatch(/\n    (?:author|stats|embed):/);
  });

  it("binds distinct caller-formatted counts and zero by source identity", () => {
    const ir = bulletin();
    const plan = nativeMetadataTextPlan(ir)!;
    const supplied = { authorName: "Ada", authorHandle: "@ada", timestamp: "09:14", statsLikes: "42", statsReplies: "0", statsReposts: "١٤" };
    const bound = plan.leaves.filter(leaf => leaf.kind === "text" && leaf.source.kind === "message").map(leaf => {
      if (leaf.kind !== "text" || leaf.source.kind !== "message") throw new Error("Expected message leaf");
      const input = metadataInput(plan, leaf.source.params[0]!.value);
      return [leaf.source.key, supplied[input.name as keyof typeof supplied]];
    });
    expect(bound).toEqual([["likes", "42"], ["replies", "0"], ["reposts", "١٤"]]);
    const label = plan.label!;
    expect(swiftMetadataText(ir, plan, label)).toContain('["name": `authorName`]');
    expect(kotlinMetadataText(ir, plan, label)).toContain('mapOf("name" to authorName)');
  });

  it.each(["Label", "Blockquote", "Skeleton"])("preserves the existing %s body projection", name => {
    expect(nativeMetadataTextPlan(corpusIR(name))).toBeUndefined();
  });

  it.each(["body", "fsdsScopes", "shape", "chromeModifier", "type", "background", "gap", "layered", "headingModifier", "fsdsFontSize", "fsdsFontWeight", "fsdsTextStyle", "fsdsRegionLabel"])("rejects an input shadowing the generated native %s binding", name => {
    const ir = bulletin();
    ir.styledProps.push({ ...ir.styledProps.find(prop => prop.name === "timestamp")!, name, safeName: name });
    const author = ir.dom!.children[0]!.children[0]!.children[0]!;
    author.content = { kind: "prop", prop: name };
    expect(() => nativeMetadataTextPlan(ir)).toThrow(/ambiguous native input/);
  });

  it.each(["label", "labelProp"])("refuses metadata ownership of a persistent region's %s binding", name => {
    const contract = JSON.parse(JSON.stringify(loadCorpusContract("Postcard")).replaceAll("postcard.design.", "bulletin.design."));
    contract.name = "Bulletin";
    contract.a11y.role = "region";
    contract.anatomy.dom.attrs = { role: "region" };
    contract.anatomy.dom.bindings["aria-label"] = "prop:label";
    delete contract.messages.postLabel;
    contract.props.styled.members.push({ name: "label", type: "string", required: true });
    if (name === "labelProp") {
      contract.props.styled.members.push({ name, type: "string", required: true });
      contract.anatomy.dom.children[0].children[0].children[0].content = `prop:${name}`;
    }
    const ir = buildComponentIR(contract);
    expect(ir.root.persistentRegionLabel?.safeName).toBe("label");
    for (const generate of [nativeMetadataTextPlan, generateSwiftUIComponentSource, generateJetpackComposeComponentSource]) {
      expect(() => generate(ir)).toThrow(new RegExp(`ambiguous native input ${name}`));
    }
  });

  it.each(["missing", "object", "collision", "malformed", "conditional", "slot-conditional", "duplicate-param", "missing-param", "second-body"])("rejects %s metadata rather than substituting a nearby source", defect => {
    const ir = bulletin();
    const author = ir.dom!.children[0]!.children[0]!.children[0]!;
    if (defect === "missing") author.content = { kind: "prop", prop: "unknown", path: ["name"] };
    if (defect === "object") author.content = { kind: "prop", prop: "author" };
    if (defect === "malformed") author.content = { kind: "prop", prop: "author", path: ["name.bad"] };
    if (defect === "collision") ir.styledProps.push({ ...ir.styledProps[0]!, name: "authorName", safeName: "authorName" });
    if (defect === "conditional") author.ifProp = "author";
    if (defect === "slot-conditional") author.ifSlot = "details";
    if (defect === "second-body") ir.dom!.children.push({ ...ir.dom!.children[1]!.children[0]! });
    if (defect === "duplicate-param") {
      const label = ir.dom!.bindings["aria-label"] as Extract<BindingExpression, { kind: "message" }>;
      label.params.push(label.params[0]!);
    }
    if (defect === "missing-param") (ir.dom!.bindings["aria-label"] as Extract<BindingExpression, { kind: "message" }>).params = [];
    expect(() => nativeMetadataTextPlan(ir)).toThrow(/NATIVE_METADATA_INVALID/);
  });

  it("fails generation when catalog ownership is removed or a message source no longer resolves", () => {
    const missing = bulletin();
    missing.messages = missing.messages.filter(message => message.key !== "likes");
    expect(() => generateSwiftUIComponentSource(missing)).toThrow(/unknown message 'likes'/);
    expect(() => generateJetpackComposeComponentSource(missing)).toThrow(/unknown message 'likes'/);
    const wrongSource = bulletin();
    const plan = nativeMetadataTextPlan(wrongSource)!;
    expect(() => swiftMetadataText(wrongSource, plan, { kind: "prop", prop: "stats", path: ["liked"] })).toThrow(/no input/);
    expect(() => kotlinMetadataText(wrongSource, plan, { kind: "prop", prop: "stats", path: ["liked"] })).toThrow(/no input/);
  });
});
