import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createGodotEmitter, godotPlan, themeColor } from "./factory.js";
import { godotActionPlan } from "./action-plan.js";
import { godotCompositePlan } from "./composite-plan.js";
const root = path.resolve(__dirname, "../../../../..");
function fixture(name: string) { return JSON.parse(fs.readFileSync(path.join(root,`packages/ds-contracts/components/${name}/${name}.contract.json`),"utf8")) as ComponentContract; }
function styledFixture(name: string) {
  const c = fixture(name);
  for (const kind of ["tokens", "styles"] as const) c[kind] = JSON.parse(fs.readFileSync(path.join(root, `packages/ds-contracts/components/${name}/${name}.${kind}.json`), "utf8"));
  return c;
}
function sequenceFixture() {
  const c = fixture("Carousel");
  for (const kind of ["tokens", "styles"] as const) c[kind] = JSON.parse(fs.readFileSync(path.join(root, `packages/ds-contracts/components/Carousel/Carousel.${kind}.json`), "utf8"));
  return c;
}
function buildSequenceFixture(c = sequenceFixture()) {
  const pagination = fixture("Pagination");
  for (const kind of ["tokens", "styles"] as const) pagination[kind] = JSON.parse(fs.readFileSync(path.join(root, `packages/ds-contracts/components/Pagination/Pagination.${kind}.json`), "utf8"));
  return buildComponentIR(c, { allContracts: new Map([[c.name, c], ["Pagination", pagination], ["Icon", fixture("Icon")]]) });
}
describe("Godot bounded lowering", () => {
  it("projects a static nested componentRef from renamed item anatomy", () => {
    const source = fixture("Accordion");
    const ir = buildComponentIR(source, { allContracts: new Map([["Accordion", source], ["Icon", fixture("Icon")]]) });
    ir.name = "RenamedGroup";
    const files = createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: path.join(root, "packages/ds-contracts") });
    const script = files.find(file => file.relativePath === "RenamedGroup/RenamedGroup.gd")!.contents;
    const encoded = script.match(/JSON.parse_string\((.+)\)/)![1]!;
    const config = JSON.parse(JSON.parse(encoded));
    expect(config.itemButtonRefs).toEqual([{ ref: "Icon", part: "chevron", attrs: { name: "chevron-down", size: "sm" } }]);
    const ref = ir.dom!.children[0]!.children[0]!.children[0]!.children[1]!;
    ref.bindings["name"] = { kind: "prop", prop: "unused" };
    expect(() => godotPlan(ir)).toThrow("GODOT_UNSUPPORTED_REF: RenamedGroup");
    delete ref.bindings["name"];
    ref.componentRef = "Unadmitted";
    expect(() => createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: path.join(root, "packages/ds-contracts") }))
      .toThrow("GODOT_UNSUPPORTED_REF: RenamedGroup Unadmitted has no admitted glyph mount capability");
  });
  it("rejects untyped glyph literals and a referenced runtime without a glyph setter", () => {
    const source = fixture("Accordion");
    const ref = (source.anatomy as { dom: { children: any[] } }).dom.children[0].children[0].children[0].children[1];
    ref.attrs.decorative = "false";
    const icon = fixture("Icon");
    expect(() => buildComponentIR(source, { allContracts: new Map([[source.name, source], [icon.name, icon]]) }))
      .toThrow("static attrs carry strings, so use a typed prop binding");
    delete ref.attrs.decorative;
    ref.attrs.size = "not-a-size";
    const invalidIR = buildComponentIR(source, { allContracts: new Map([[source.name, source], [icon.name, icon]]) });
    expect(() => godotPlan(invalidIR)).toThrow("has an invalid enum literal");
    ref.componentRef = "fsds.Button";
    ref.attrs = { variant: "primary" };
    (source.anatomy as { details: Record<string, { componentRef: string }> }).details.chevron.componentRef = "fsds.Button";
    const button = fixture("Button");
    const buttonIR = buildComponentIR(source, { allContracts: new Map([[source.name, source], [button.name, button]]) });
    expect(() => godotPlan(buttonIR)).toThrow("has no admitted glyph mount capability");
  });
  it("emits renamed compound parts as persistent scene hosts with source-addressed styling", () => {
    const source = styledFixture("Card");
    const ir = buildComponentIR(source);
    ir.name = "ArticleSurface";
    const plan = godotCompositePlan(ir);
    if (!plan) throw new Error("Compound plan was not selected");
    expect(plan.operation).toBe("composite");
    expect(plan.parts).toEqual(["header", "media", "content", "footer", "actions", "badge", "description", "link", "note"]);
    expect(plan.styles.find(rule => rule.source === "root")?.declarations).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: "background-color", token: "card.color.background.default", designSlot: "card.design.root.background.fill" }),
      expect.objectContaining({ property: "padding", token: "card.size.padding" }),
    ]));
    expect(plan.styles.find(rule => rule.source === "--inset")?.predicates).toEqual([{ kind: "variant", axis: "density", value: "inset" }]);
    const files = createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: "" });
    const scene = files.find(file => file.relativePath === "ArticleSurface/ArticleSurface.tscn")!.contents;
    expect(scene).toContain('parent="Chrome/Body/Part_content"');
    expect(scene).toContain('parent="Chrome/Body/Part_actions"');
    expect(files.find(file => file.relativePath === "ArticleSurface/ArticleSurface.gd")!.contents).toContain("runtime/composite.gd");
    const capabilities = JSON.parse(files.find(file => file.relativePath.endsWith("capabilities.json"))!.contents);
    expect(capabilities.omissions).toContain("root.box-shadow: no Godot composite style mapping");
  });
  it("projects decorated content into icon and content hosts without inventing a default glyph", () => {
    const ir = buildComponentIR(styledFixture("Badge"));
    ir.name = "Marker";
    const plan = godotCompositePlan(ir);
    if (!plan) throw new Error("Decorated plan was not selected");
    expect(plan.layout).toBe("inline");
    expect(plan.parts).toEqual(["icon", "content"]);
    expect(plan.contentPart).toBe("content");
    expect(plan.excluded).toEqual(["showStatusIcon"]);
    expect(plan.omissions).toContain("showStatusIcon: no executable native composition fact");
    expect(plan.styles.find(rule => rule.source === "--danger")?.declarations).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: "badge.color.background.default", value: "#fac2c2" }),
    ]));
  });
  it("names new composite props as excluded and refuses changed decorated anatomy", () => {
    const card = styledFixture("Card");
    card.props!.designed!.members!.push({ name: "futureBehavior", propType: { kind: "boolean" } });
    const plan = godotCompositePlan(buildComponentIR(card));
    expect(plan?.excluded).toContain("futureBehavior");
    expect(plan?.omissions).toContain("futureBehavior: no executable native composition fact");
    const badge = buildComponentIR(styledFixture("Badge"));
    badge.dom!.children[0]!.ifProp = "showStatusIcon";
    expect(() => godotPlan(badge)).toThrow("GODOT_UNSUPPORTED_COMPOSITE_ANATOMY: Badge");
    badge.dom!.children[0]!.ifProp = "icon";
    badge.dom!.children[1]!.events.click = { kind: "prop", prop: "icon" };
    expect(() => godotPlan(badge)).toThrow("GODOT_UNSUPPORTED_COMPOSITE_ANATOMY: Badge");
  });
  it("lowers renamed projected actions from anatomy and authored style rules", () => {
    const source = styledFixture("Button");
    const renamed = JSON.parse(JSON.stringify(source).replaceAll("onClick", "onActivate")) as ComponentContract;
    const ir = buildComponentIR(renamed);
    ir.name = "Pressable";
    const plan = godotActionPlan(ir);
    if (!plan) throw new Error("Action plan was not selected");
    expect(godotPlan(ir).operation).toBe("action");
    expect(plan.props.action).toBe("onActivate");
    expect(plan.props.loading).toBe("loading");
    expect(plan.excluded).toEqual(["type", "ariaExpanded", "ariaPressed"]);
    expect(plan.styles.find(rule => rule.source === "--secondary")?.declarations).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: "button.color.background.default", value: "#fafafa" }),
    ]));
    expect(plan.omissions).toContain("root.transition-duration: no Godot action style mapping");
    expect(plan.omissions).toContain("--destructive.button.color.background.default: platform web,ios,android only");
    const files = createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: "" });
    expect(files.find(file => file.relativePath === "Pressable/Pressable.gd")?.contents).toContain("runtime/action.gd");
    expect(JSON.parse(files.find(file => file.relativePath === "Pressable/capabilities.json")!.contents).excludedProps).toEqual(plan.excluded);
  });
  it("rejects new action props instead of treating them as declared exclusions", () => {
    const source = styledFixture("Button");
    source.props!.designed!.members!.push({ name: "futureBehavior", propType: { kind: "boolean" } });
    expect(() => godotPlan(buildComponentIR(source))).toThrow("GODOT_UNSUPPORTED_PROP: Button.futureBehavior");
  });
  it("rejects an unlowered action anatomy fact", () => {
    const ir = buildComponentIR(styledFixture("Button"));
    ir.dom!.attrs["data-extra"] = "unprojected";
    expect(() => godotPlan(ir)).toThrow("GODOT_UNSUPPORTED_ACTION_ANATOMY: Button");
  });
  it("initializes authored action state defaults and refuses an invalid default", () => {
    const source = styledFixture("Button");
    const disabled = source.props!.designed!.members!.find(member => member.name === "disabled");
    if (!disabled) throw new Error("Missing disabled fixture prop");
    Object.assign(disabled, { default: true });
    const ir = buildComponentIR(source);
    expect(ir.styledProps.find(prop => prop.name === "disabled")?.defaultExpr).toBe("true");
    const script = createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: "" })
      .find(file => file.relativePath === "Button/Button.gd")?.contents;
    expect(script).toContain("apply_config_defaults()");
    Object.assign(disabled, { default: "not-a-boolean" });
    expect(() => godotPlan(buildComponentIR(source))).toThrow("GODOT_UNSUPPORTED_ACTION_DEFAULT: Button.disabled");
  });
  it("names state typography and unused gap instead of crediting their styling", () => {
    const source = styledFixture("Button");
    const styles = source.styles as unknown as Record<string, Record<string, unknown>>;
    styles.hover["font-size"] = { literal: "40px", platforms: ["godot"] };
    const plan = godotActionPlan(buildComponentIR(source));
    if (!plan) throw new Error("Action plan was not selected");
    expect(plan.omissions).toContain("hover.font-size: native state typography and geometry are not lowered");
    expect(plan.omissions).toContain("root.gap: no Godot action style mapping");
    expect(plan.styles.find(rule => rule.source === "hover")?.declarations.some(declaration => declaration.property === "font-size")).toBe(false);
  });
  it.each([["Switch","boolean"],["Accordion","toggle-item"],["Tabs","select"],["Popover","surface"]])("lowers %s after identity substitution", (name,op) => {
    const c=fixture(name); c.name="Renamed";
    expect(godotPlan(buildComponentIR(c)).operation).toBe(op);
  });
  it("rejects a prop family the support boundary has not adjudicated", () => {
    // The boundary is a ratchet: an unclassified family fails generation rather
    // than becoming a silent exclusion.
    const c=fixture("Switch"); c.props!.designed!.members!.push({name:"futureBehavior",propType:{kind:"boolean"}});
    expect(()=>godotPlan(buildComponentIR(c))).toThrow("GODOT_UNCLASSIFIED_PROP: Switch.futureBehavior");
  });
  it("plans a wider presence surface with named omissions instead of refusing", () => {
    const plan = godotPlan(buildComponentIR(fixture("Dialog")));
    expect(plan.operation).toBe("surface");
    if (!("anchor" in plan)) throw new Error("Dialog did not plan as a wider surface");
    expect(plan.anchor).toBe("none");
    expect(plan.omissions.length).toBeGreaterThan(0);
    expect(plan.excluded).toEqual(expect.arrayContaining(["modal", "initialFocus"]));
  });
  it("exposes known pilot exclusions", () => {
    expect(godotPlan(buildComponentIR(fixture("Switch"))).excluded).toEqual(expect.arrayContaining(["size","name","value","defaultChecked"]));
  });
  it("lowers sequence prop and channel identities from normalized facts", () => {
    const c = sequenceFixture();
    c.name = "Gallery";
    const serialized = JSON.stringify(c).replaceAll('carousel', 'gallery').replaceAll('"slides"', '"entries"').replaceAll('prop:slides', 'prop:entries').replaceAll('"index"', '"selection"').replaceAll('"duration"', '"dwell"').replaceAll('"autoPlay"', '"rotateAutomatically"');
    const renamed = JSON.parse(serialized) as ComponentContract;
    // Rename the host API without renaming the referenced component's API.
    const dom = !Array.isArray(renamed.anatomy) && renamed.anatomy?.dom;
    const restoreTargetProps = (node: import("../../contract.js").ContractDomNode) => {
      if (node.componentRef && node.bindings?.selection) {
        node.bindings.index = node.bindings.selection;
        delete node.bindings.selection;
      }
      node.children?.forEach(restoreTargetProps);
    };
    if (dom) restoreTargetProps(dom);
    // Message placeholders name template slots, not host props: the blanket
    // `"index"` rename must not reach the slide-position template's params.
    for (const [key, message] of Object.entries(c.messages ?? {})) {
      if (message.params) renamed.messages![key]!.params = message.params;
    }
    const ir = buildSequenceFixture(renamed);
    const files = createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: "" });
    const script = files.find(file => file.relativePath === "Gallery/Gallery.gd")!.contents;
    const encoded = script.match(/JSON.parse_string\((.+)\)/)![1]!;
    const config = JSON.parse(JSON.parse(encoded));
    expect(config.channel.valueProp).toBe("selection");
    expect(config.sequence.itemsProp).toBe("entries");
    expect(config.sequence.timing).toMatchObject({ durationProp: "dwell", autoPlayProp: "rotateAutomatically", defaultMs: 6000 });
    expect(config.sequence.transition).toMatchObject({ durationMs: 250, referenceWidth: 320, maxMultiplier: 2 });
    expect(config.names).toEqual({ previous: "Previous slide", next: "Next slide" });
    // The runtime shows labels.start/stop as rotation text: contract defaults, not message keys.
    expect(config.sequence.labels).toEqual({
      start: "Start slide rotation",
      stop: "Stop slide rotation",
      item: "slide",
      position: "{index} of {count}",
    });
    expect(config.sequence.progress.map((p: {effect: string}) => p.effect)).toEqual(["elapsed-width", "elapsed-ring"]);
    expect(JSON.parse(files.find(file => file.relativePath.endsWith("capabilities.json"))!.contents).excludedProps).toEqual([]);
  });
  it("requires the referenced contract before lowering composed progress", () => {
    expect(() => godotPlan(buildComponentIR(sequenceFixture()))).toThrow("GODOT_UNRESOLVED_SEQUENCE");
    expect(buildSequenceFixture().motion.sequence!.progressHosts).toEqual(["picker", "next"]);
  });
  it("rejects unimplemented sequence props and progress placement", () => {
    const ir = buildSequenceFixture();
    ir.styledProps.push({ ...ir.styledProps[0]!, name: "futureSequenceBehavior" });
    expect(() => godotPlan(ir)).toThrow("GODOT_UNSUPPORTED_PROP: Carousel.futureSequenceBehavior");
    ir.styledProps.pop();
    ir.motion.sequence!.progress[0]!.effect = "elapsed-ring";
    expect(() => godotPlan(ir)).toThrow("GODOT_UNSUPPORTED_PROGRESS_HOST: Carousel.fill");
  });
  it("projects a changed token fallback into the Godot theme", () => {
    const ir=buildComponentIR(fixture("Accordion"));
    ir.cssBlocks=[{selector:".renamed",declarations:{color:"var(--probe)"}}];
    ir.tokenFacts=[{name:"probe",cssVar:"--probe",category:"color",layer:"semantic",source:"tokens-sidecar",isLiteral:true,rawValue:"#123456"}];
    expect(themeColor(ir)).toBe("#123456");
    const files=createGodotEmitter().emitComponent(ir,{componentsRoot:"",contractsRoot:""});
    expect(files.find(f=>f.relativePath.endsWith("theme.tres"))!.contents).toContain("Color(0.07058823529411765, 0.20392156862745098, 0.33725490196078434, 1)");
  });
  it("lowers renamed passive text and rule shapes from styled IR", () => {
    const text = buildComponentIR(styledFixture("Text")); text.name = "Prose";
    const divider = buildComponentIR(styledFixture("Divider")); divider.name = "RuleLine";
    const textFiles = createGodotEmitter().emitComponent(text, { componentsRoot: "", contractsRoot: "" });
    const ruleFiles = createGodotEmitter().emitComponent(divider, { componentsRoot: "", contractsRoot: "" });
    const configOf = (files: typeof textFiles) => {
      const script = files.find(file => file.relativePath.endsWith(".gd"))!.contents;
      const encoded = script.match(/JSON.parse_string\((.+)\)/)![1]!;
      return JSON.parse(JSON.parse(encoded));
    };
    const prose = configOf(textFiles);
    const rule = configOf(ruleFiles);
    expect(textFiles.find(file => file.relativePath === "Prose/Prose.gd")!.contents).toContain("runtime/static_content.gd");
    expect(prose.operation).toBe("static-text");
    expect(prose.excluded).toEqual(["as"]);
    expect(prose.styles.find((entry: { source: string }) => entry.source === "--display").declarations).toEqual(expect.arrayContaining([{ property: "font-size", value: "3.75rem", token: "text.size.md" }]));
    expect(rule.operation).toBe("rule");
    expect(rule.excluded).toEqual(["decorative"]);
    expect(rule.styles.find((entry: { source: string }) => entry.source === "root").declarations).toEqual(expect.arrayContaining([{ property: "border-top-color", value: "#d0d0d0", token: "divider.color" }]));
    expect(rule.styles.find((entry: { source: string }) => entry.source === "--vertical").predicates).toEqual([{ kind: "variant", axis: "orientation", value: "vertical" }]);
    const textReceipt = JSON.parse(textFiles.find(file => file.relativePath === "Prose/capabilities.json")!.contents);
    expect(textReceipt.excludedProps).toEqual(["as"]);
    expect(textReceipt.fidelityGaps).toEqual([
      "children.node-ref: content is String-only; retained inline node composition is not realized",
      "as: DOM element and heading semantics have no native mapping",
      "typography.font-family: SystemFont fallback does not preserve the authored Web font family",
      "typography.line-height: integer line_spacing approximates CSS line boxes",
      "typography.letter-spacing: integer glyph spacing rounds fractional tracking",
      "transform.capitalize: Godot String.capitalize word normalization differs from CSS text-transform",
    ]);
    const ruleReceipt = JSON.parse(ruleFiles.find(file => file.relativePath === "RuleLine/capabilities.json")!.contents);
    expect(ruleReceipt.excludedProps).toEqual(["decorative"]);
    expect(ruleReceipt.fidelityGaps).toEqual([
      "decorative: semantic separator versus presentation has no native accessibility mapping",
      "layout: parent-constrained Godot container geometry is not CSS flow/flex layout parity",
    ]);
  });
  it("preserves changed static style facts and rejects unsupported props", () => {
    const prose = styledFixture("Text");
    prose.styles!["--display"]!["text.size.md"]!.fallback = "4rem";
    const plan = godotPlan(buildComponentIR(prose));
    expect(plan.operation).toBe("static-text");
    if (!("styles" in plan)) throw new Error("Static plan lost its style projection");
    expect(plan.styles.find(entry => entry.source === "--display")?.declarations.find(entry => entry.property === "font-size")?.value).toBe("4rem");
    const divider = styledFixture("Divider");
    divider.tokens!["divider.color"]!.fallback = "#123456";
    const rule = godotPlan(buildComponentIR(divider));
    expect(rule.operation).toBe("rule");
    if (!("styles" in rule)) throw new Error("Rule plan lost its style projection");
    expect(rule.styles.find(entry => entry.source === "root")?.declarations.find(entry => entry.property === "border-top-color")?.value).toBe("#123456");
    // A prop outside the narrow static allowlist makes the static shape decline;
    // the generic anatomy fallback then has to account for it, and an
    // unadjudicated family is refused rather than silently excluded.
    prose.props!.designed!.members!.push({ name: "futureBehavior", propType: { kind: "boolean" } });
    expect(() => godotPlan(buildComponentIR(prose))).toThrow("GODOT_UNCLASSIFIED_PROP: Text.futureBehavior");
  });
  it("routes unlowered passive anatomy through the generic shape with named omissions", () => {
    // A fact the narrow static shape cannot carry is no longer a refusal: the
    // generic anatomy shape emits the component and names the gap. Refusing here
    // would keep the corpus out of the admitted set for a styling detail.
    const ir = buildComponentIR(styledFixture("Text"));
    ir.dom!.attrs["data-unhandled"] = "true";
    const anatomy = godotPlan(ir);
    expect(anatomy.operation).toBe("anatomy");
    if (!("omissions" in anatomy) || !anatomy.omissions) throw new Error("Anatomy plan lost its omission receipt");
    expect(anatomy.omissions.length).toBeGreaterThan(0);
    delete ir.dom!.attrs["data-unhandled"];
    const rootRule = ir.nativeStyleRules!.rules.find(rule => rule.sourceKey === "root")!;
    ir.nativeStyleRules!.rules.push({ ...rootRule, sourceKey: "root::before", pseudo: "before" });
    const styled = godotPlan(ir);
    expect(styled.operation).toBe("anatomy");
    if (!("omissions" in styled) || !styled.omissions) throw new Error("Anatomy plan lost its omission receipt");
    expect(styled.omissions.some(line => line.includes("root::before") || line.includes("::before"))).toBe(true);
  });
  it("does not project another platform's style declaration into Godot", () => {
    const c = styledFixture("Text");
    c.styles!.root!.color = { literal: "#ff0000", platforms: ["ios"] };
    const ir = buildComponentIR(c);
    const plan = godotPlan(ir);
    expect(plan.operation).toBe("static-text");
    if (!("styles" in plan)) throw new Error("Static plan lost its style projection");
    expect(plan.styles.find(entry => entry.source === "root")?.declarations.find(entry => entry.property === "color")).toBeUndefined();
    const files = createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: "" });
    expect(files.find(file => file.relativePath === "Text/theme.tres")!.contents).not.toContain("Color(1, 0, 0, 1)");
  });
});
