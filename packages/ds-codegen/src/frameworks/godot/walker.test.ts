import { describe, expect, it } from "vitest";
import type { DomNodeIR } from "../../ir.js";
import { corpusIR } from "../corpus-fixtures.js";
import { godotCompositePlan } from "./composite-plan.js";
import { godotAnatomyPlan } from "./walker.js";

/** The generic anatomy plan is the fallback shape: it must claim arbitrary
 * part/DOM trees, decline every bounded shape a specialised planner owns, and
 * receipt every fact it does not lower. These tests read real corpus contracts,
 * so a contract change that adds a fact the planner would drop fails here. */

function plan(name: string) {
  const result = godotAnatomyPlan(corpusIR(name));
  if (!result) throw new Error(`${name} was not planned`);
  return result;
}

describe("generic anatomy planner: structural projection", () => {
  it("projects a simple passive anatomy's root content region without invented nodes", () => {
    const blockquote = plan("Blockquote");
    expect(blockquote.operation).toBe("anatomy");
    expect(blockquote.rootType).toBe("VBoxContainer");
    expect(blockquote.sceneNodes).toEqual([]);
    expect(blockquote.parts).toEqual([]);
    expect(blockquote.contentPart).toBe("root");
    expect(blockquote.projectedProps).toEqual(["variant", "size"]);
    expect(blockquote.excluded).toEqual(["cite"]);
    expect(blockquote.omissions).toEqual(expect.arrayContaining([
      "layout: generated part hosts are Godot containers; CSS flow geometry and authored child order are not parity-guaranteed",
      "cite: no executable native projection",
    ]));
    // The root paints its own panel through the shared runtime's `_draw`.
    expect(blockquote.styles.find(rule => rule.source === "root")?.declarations).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: "background-color" }),
      expect.objectContaining({ property: "color" }),
    ]));
    expect(blockquote.styles.find(rule => rule.source === "--bordered")?.predicates).toEqual([
      { kind: "variant", axis: "variant", value: "bordered" },
    ]);
    // Region padding has no padded panel on the root container: named, not dropped.
    expect(blockquote.omissions).toContain("root.padding: host root has no padded panel to inset its children");
  });

  it("projects part hosts with Godot paths, including nested and repeated parts", () => {
    const progress = plan("Progress");
    expect(progress.sceneNodes).toEqual([
      { name: "track", type: "PanelContainer", parent: ".", part: "track" },
      { name: "fill", type: "PanelContainer", parent: "track", part: "fill" },
      { name: "value", type: "VBoxContainer", parent: ".", part: "value" },
    ]);
    expect(progress.parts).toEqual(["track", "fill", "value"]);
    expect(progress.contentPart).toBe("value");
    expect(progress.styles.find(rule => rule.source === "track")?.declarations).toEqual([
      expect.objectContaining({ property: "background-color", value: "#f7f7f7" }),
    ]);
    expect(progress.styles.find(rule => rule.source === ".progress--success .progress__fill")?.predicates).toEqual([
      { kind: "variant", axis: "intent", value: "success" },
    ]);
    expect(progress.omissions).toContain("value: render guard (if showValue) not lowered; host always emitted");

    const shuttle = plan("Shuttle");
    expect(shuttle.sceneNodes.map(node => node.name)).toEqual(["list", "item", "controls", "add", "remove", "list_2", "item_2"]);
    expect(shuttle.sceneNodes.filter(node => node.part === "list").map(node => node.parent)).toEqual([".", "."]);
    expect(shuttle.omissions).toContain("item: iteration (array) emits a single host; repeated native instances not lowered");
  });

  it("flattens anonymous wrappers into the nearest named ancestor and promotes pinned literal text", () => {
    const navTree = plan("NavTree");
    // The glyph `<svg>` has no part: it folds into the named `icon` part.
    expect(navTree.sceneNodes).toEqual([
      { name: "heading", type: "VBoxContainer", parent: ".", part: "heading" },
      { name: "icon", type: "PanelContainer", parent: "heading", part: "icon" },
      { name: "headingLink", type: "Label", parent: "heading", part: "headingLink" },
      { name: "headingLabel", type: "Label", parent: "heading", part: "headingLabel" },
      { name: "list", type: "VBoxContainer", parent: ".", part: "list" },
    ]);
    expect(navTree.contentPart).toBe("list");
    expect(navTree.omissions).toContain("icon: glyph binding not lowered");

    const calendar = plan("Calendar");
    const nav = calendar.sceneNodes.filter(node => node.part === "nav");
    expect(nav.map(node => node.text)).toEqual(["‹", "›"]);
    expect(nav.map(node => node.type)).toEqual(["Button", "Button"]);

    const codeSnippet = plan("CodeSnippet");
    expect(codeSnippet.rootType).toBe("Label");
    expect(codeSnippet.omissions).toContain("root: content binding (prop:text) not projected; host text is unbound");
    const input = plan("Input");
    expect(input.rootType).toBe("LineEdit");
    const image = plan("Image");
    expect(image.rootType).toBe("TextureRect");
  });

  it("marks the consumer content host for a part that owns the children region", () => {
    const table = plan("Table");
    expect(table.sceneNodes).toEqual([{ name: "container", type: "VBoxContainer", parent: ".", part: "container" }]);
    expect(table.contentPart).toBe("container");
    expect(table.omissions).toEqual(expect.arrayContaining([
      "compound part row: by-reference subcomponent region; no scene host emitted",
      "compound part cell: by-reference subcomponent region; no scene host emitted",
    ]));
    const chip = plan("Chip");
    expect(chip.contentPart).toBe("text");
    expect(chip.omissions).toContain("action: referenced Button component instance is not composed; an empty part host is emitted");
    expect(chip.omissions).toContain("dismiss: referenced Button component instance is not composed; an empty part host is emitted");
  });
});

describe("generic anatomy planner: bounded shapes are never stolen", () => {
  it("declines every shape a specialised planner owns", () => {
    const cases: Array<[string, string]> = [
      ["Badge", "bounded decorated composite"],
      ["Card", "compound-part composite"],
      ["Button", "projected-children action"],
      ["Text", "bounded static text"],
      ["Divider", "bare rule"],
      ["Switch", "boolean-form control"],
      ["Checkbox", "boolean-form control"],
      ["Accordion", "toggle-item control"],
      ["Tabs", "select control"],
      ["Carousel", "sequence"],
      ["Icon", "pure glyph host"],
      ["Dialog", "wide surface"],
      ["Tooltip", "wide surface"],
    ];
    for (const [name, why] of cases) {
      expect(godotAnatomyPlan(corpusIR(name)), `${name} (${why}) must be declined`).toBeUndefined();
    }
    // The composite planner still claims its bounded shapes.
    expect(godotCompositePlan(corpusIR("Badge"))?.operation).toBe("composite");
    expect(godotCompositePlan(corpusIR("Card"))?.operation).toBe("composite");
  });

  it("routes Alert and AlertNotice to the generic structure when composite cannot host them", () => {
    for (const name of ["Alert", "AlertNotice"]) {
      const ir = corpusIR(name);
      expect(godotCompositePlan(ir), `${name}: composite must decline`).toBeUndefined();
      const anatomy = godotAnatomyPlan(ir);
      if (!anatomy) throw new Error(`${name} was not planned`);
      expect(anatomy.parts).toEqual(["icon", "dismiss"]);
      expect(anatomy.contentPart).toBe("root");
      expect(anatomy.sceneNodes.map(node => node.name)).toEqual(["icon", "dismiss"]);
      expect(anatomy.omissions).toContain("part dismiss: declared interactive/focusable; native activation and focus unlowered");
    }
    // Alert's dismiss control is a Button reference; AlertNotice's is a native
    // button. The reference fact is named, and the native element keeps a
    // Button host instead of being invented away.
    expect(plan("Alert").omissions).toContain("dismiss: referenced Button component instance is not composed; an empty part host is emitted");
    expect(plan("AlertNotice").sceneNodes.find(node => node.part === "dismiss")?.type).toBe("Button");
    // A decorated anatomy that IS the bounded two-region shape still throws
    // through composite rather than silently degrading to the generic shape.
    const badge = corpusIR("Badge");
    badge.dom!.children[0]!.ifProp = "showStatusIcon";
    expect(() => godotCompositePlan(badge)).toThrow("GODOT_UNSUPPORTED_COMPOSITE_ANATOMY: Badge");
  });

  it("does not dispatch on component identity: a renamed IR plans identically", () => {
    for (const name of ["Progress", "NavList", "Alert"]) {
      const original = corpusIR(name);
      const renamed = corpusIR(name);
      renamed.name = "RenamedSurface";
      expect(godotAnatomyPlan(renamed)).toEqual(godotAnatomyPlan(original));
    }
  });
});

describe("generic anatomy planner: typed refusals", () => {
  it("refuses multiple consumer-content regions with a typed error", () => {
    const ir = corpusIR("Blockquote");
    const template = ir.dom!.children[0]!;
    ir.dom!.children.push(JSON.parse(JSON.stringify(template)) as DomNodeIR);
    expect(() => godotAnatomyPlan(ir)).toThrow("GODOT_UNSUPPORTED_ANATOMY: Blockquote multiple consumer-content regions (2)");
  });

  it("refuses a dom part the contract does not declare", () => {
    const ir = corpusIR("Table");
    ir.dom!.children[0]!.part = "ghost";
    expect(() => godotAnatomyPlan(ir)).toThrow("GODOT_UNSUPPORTED_ANATOMY: Table dom part ghost is not declared in anatomy.parts");
  });

  it("refuses structure nested under a consumer-content insertion point", () => {
    const ir = corpusIR("Blockquote");
    ir.dom!.children[0]!.children.push(JSON.parse(JSON.stringify(ir.dom!.children[0])) as DomNodeIR);
    expect(() => godotAnatomyPlan(ir)).toThrow(/^GODOT_UNSUPPORTED_ANATOMY: /);
  });
});

describe("generic anatomy planner: receipts have no silent drops", () => {
  const sweep = [
    "Alert", "AlertNotice", "Avatar", "Breadcrumbs", "Calendar", "Chip", "CodeBlock",
    "Details", "Field", "Input", "NavList", "NavTree", "OTP", "PageNavigator",
    "Pagination", "Postcard", "Progress", "RadioGroup", "Select", "ShowMore",
    "Shuttle", "Skeleton", "Spinner", "Status", "Table", "TextField", "Truncate",
    "Markdown",
  ] as const;

  it("partitions every styled prop into projected or excluded, naming every exclusion", () => {
    for (const name of sweep) {
      const ir = corpusIR(name);
      const anatomy = godotAnatomyPlan(ir);
      if (!anatomy) throw new Error(`${name} was not planned`);
      const names = anatomy.projectedProps.concat(anatomy.excluded);
      expect(new Set(names).size, `${name}: duplicate prop receipt`).toBe(names.length);
      expect(names.slice().sort(), `${name}: prop receipt is not a partition`).toEqual(ir.styledProps.map(prop => prop.name).slice().sort());
      for (const prop of anatomy.excluded) {
        expect(
          anatomy.omissions.some(omission => omission.startsWith(`${prop}: `)),
          `${name}: excluded prop ${prop} has no named omission`,
        ).toBe(true);
      }
      expect(anatomy.omissions.length, `${name}: an anatomy plan must never be silent`).toBeGreaterThan(0);
    }
  });

  it("declares every generated host and resolves every parent path to an earlier host", () => {
    for (const name of sweep) {
      const anatomy = plan(name);
      const emitted = new Set<string>();
      for (const node of anatomy.sceneNodes) {
        expect(node.parent === "." || emitted.has(node.parent), `${name}: ${node.name} has no emitted parent`).toBe(true);
        expect(emitted.has(node.name), `${name}: duplicate scene node ${node.name}`).toBe(false);
        emitted.add(node.parent === "." ? node.name : `${node.parent}/${node.name}`);
      }
      if (anatomy.contentPart !== undefined && anatomy.contentPart !== "root") {
        expect(anatomy.parts, `${name}: contentPart is not a hosted part`).toContain(anatomy.contentPart);
      }
      for (const part of anatomy.parts) {
        expect(anatomy.sceneNodes.some(node => node.part === part), `${name}: part ${part} has no host`).toBe(true);
      }
    }
  });

  it("names every contract fact family the structural projection cannot lower", () => {
    const select = plan("Select");
    expect(select.omissions).toEqual(expect.arrayContaining([
      "channel selection: native string | string[] flow not lowered (value/onChange)",
      "composite control (collection-selection): native collection state and update flow not lowered",
      "trigger: attribute bindings (disabled, aria-label, aria-expanded) not projected natively",
      "root accessibility role and labeling: native projection unverified",
    ]));
    const details = plan("Details");
    expect(details.omissions).toEqual(expect.arrayContaining([
      "channel open: native boolean flow not lowered (open/onOpenChange)",
      "interaction trigger summary (toggle): native activation and refused-state behavior not lowered",
      "summary: event bindings (click) are not wired natively",
    ]));
    const markdown = plan("Markdown");
    expect(markdown.omissions).toContain("root: content transform (markdown) not lowered");
    const field = plan("Field");
    expect(field.omissions).toEqual(expect.arrayContaining([
      "label: named slot label is folded into the part host; the slot contract is unlowered",
      "control: named slot control is folded into the part host; the slot contract is unlowered",
      "validatingIndicator: render guard (if validating) not lowered; host always emitted",
    ]));
    const showMore = plan("ShowMore");
    expect(showMore.omissions).toContain("textOverflow: native line clamping and expansion not lowered");
    const calendar = plan("Calendar");
    expect(calendar.omissions).toContain("date grid: native month derivation and date selection not lowered");
    const shuttle = plan("Shuttle");
    expect(shuttle.omissions).toContain("transfer: native partitioned list transfer behavior not lowered");
    const pagination = plan("Pagination");
    expect(pagination.omissions).toContain("paged set page: native position request flow not lowered");
    const skeleton = plan("Skeleton");
    expect(skeleton.omissions).toEqual(expect.arrayContaining([
      "aspectRatio: no executable native projection",
      "lines: drives node iteration; repeated native instances unlowered",
      "root accessibility role and labeling: native projection unverified",
    ]));
  });

  it("keeps the guarded style vocabulary: unmapped declarations and selectors are omissions", () => {
    const progress = corpusIR("Progress");
    progress.nativeStyleRules!.rules.push({
      sourceKey: "probe-paint",
      part: "value",
      predicates: [],
      declarations: [{ property: "background-color", value: "#000000" }],
    });
    progress.nativeStyleRules!.rules.push({
      sourceKey: "probe-opacity",
      part: "root",
      predicates: [],
      declarations: [{ property: "opacity", value: "0.5" }],
    });
    progress.nativeStyleRules!.rules.push({
      sourceKey: "probe-state",
      part: "root",
      predicates: [{ kind: "hover", ownerPart: "root" }],
      declarations: [{ property: "background-color", value: "#000000" }],
    });
    const anatomy = godotAnatomyPlan(progress);
    if (!anatomy) throw new Error("Progress was not planned");
    expect(anatomy.omissions).toEqual(expect.arrayContaining([
      "probe-paint.background-color: host stack paints no panel",
      "probe-opacity.opacity: no Godot anatomy style mapping",
      "probe-state: state selector not lowered",
    ]));
    expect(anatomy.styles.some(rule => rule.source === "probe-paint")).toBe(false);
  });
});
