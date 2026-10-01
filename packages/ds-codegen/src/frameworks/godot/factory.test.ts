import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createGodotEmitter, godotPlan, themeColor } from "./factory.js";
const root = path.resolve(__dirname, "../../../../..");
function fixture(name: string) { return JSON.parse(fs.readFileSync(path.join(root,`packages/ds-contracts/components/${name}/${name}.contract.json`),"utf8")) as ComponentContract; }
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
  it.each([["Switch","boolean"],["Accordion","toggle-item"],["Tabs","select"],["Popover","surface"]])("lowers %s after identity substitution", (name,op) => {
    const c=fixture(name); c.name="Renamed";
    expect(godotPlan(buildComponentIR(c)).operation).toBe(op);
  });
  it("rejects an unknown prop and unsupported surface instead of silent omission", () => {
    const c=fixture("Switch"); c.props!.designed!.members!.push({name:"futureBehavior",propType:{kind:"boolean"}});
    expect(()=>godotPlan(buildComponentIR(c))).toThrow("GODOT_UNSUPPORTED_PROP: Switch.futureBehavior");
    expect(()=>godotPlan(buildComponentIR(fixture("Dialog")))).toThrow(/GODOT_UNSUPPORTED/);
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
    expect(config.sequence.progress.map((p: {effect: string}) => p.effect)).toEqual(["elapsed-width", "elapsed-ring"]);
    expect(JSON.parse(files.find(file => file.relativePath.endsWith("capabilities.json"))!.contents).excludedProps).toEqual(["indicator"]);
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
});
