import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR, type ComponentIR } from "../../ir.js";
import { godotSurfacePlan } from "./surface-plan.js";

const root = path.resolve(__dirname, "../../../../..");

/** The five surface families the narrow control gate refuses today. */
const SURFACE_FAMILIES = ["Dialog", "Sheet", "Toast", "Command", "Tooltip"] as const;

function fixture(name: string, renamed?: string): ComponentIR {
  const base = path.join(root, `packages/ds-contracts/components/${name}/${name}`);
  const contract = JSON.parse(fs.readFileSync(`${base}.contract.json`, "utf8")) as ComponentContract & Record<string, unknown>;
  for (const kind of ["tokens", "styles"]) {
    const file = `${base}.${kind}.json`;
    if (fs.existsSync(file)) contract[kind] = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  const ir = buildComponentIR(contract);
  if (renamed !== undefined) ir.name = renamed;
  return ir;
}

function planOf(name: string) {
  const plan = godotSurfacePlan(fixture(name));
  if (!plan) throw new Error(`${name} did not plan`);
  return plan;
}

describe("Godot wider surface plan", () => {
  it("plans a blocking centered dialog and receipts modality, dismissal, focus and a11y gaps", () => {
    const plan = planOf("Dialog");
    expect(plan).toMatchObject({ operation: "surface", anchor: "none", modality: "blocking", openTriggers: [] });
    expect(plan.excluded).toEqual(expect.arrayContaining([
      "defaultOpen", "modal", "dismissible", "closeOnBackdropClick", "closeOnEscape", "initialFocus", "returnFocus", "ariaLabel", "ariaLabelledby", "ariaDescribedby",
    ]));
    // The open-state prop axis is the one prop family the overlay base realizes.
    expect(plan.excluded).not.toContain("open");
    expect(plan.excluded).not.toContain("onOpenChange");
    expect(plan.omissions).toEqual(expect.arrayContaining([
      "modality: blocking backdrop and focus containment unlowered",
      "modality: modal prop gate does not downgrade blocking behaviour",
      "dismissal: escape, outside-click and close-button closing unlowered",
      "dismissal: closeOnEscape, dismissible and closeOnBackdropClick gating unlowered",
      "stacking: overlay order and host layer unverified; declared modal layering, body mount target, backdrop enabled not projected",
      "positioning: centered placement unlowered",
      "content: the modal subtree is not projected into a native scene; consumers mount surface content",
      "anatomy: 4 compound parts (header, title, body and footer) have no native hosts",
      "focus: focus trapping and containment unlowered",
      "focus: initialFocus initial-focus prop unlowered",
      "focus: returnFocus focus-restoration prop unlowered",
      "focus: body scroll lock has no native mapping",
      "a11y: the dialog role has no native accessibility projection",
      "a11y: aria-label, aria-labelledby and aria-describedby labeling has no native accessibility projection",
      "state: defaultOpen initial open value unlowered",
      "interaction: close trigger on part closeButton unlowered",
      "presence: unmount content presence is not modeled; open/close only toggles the host",
    ]));
  });

  it("plans a viewport-edge sheet and receipts its placement prop and slide geometry", () => {
    const plan = planOf("Sheet");
    expect(plan).toMatchObject({ anchor: "none", modality: "blocking" });
    expect(plan.excluded).toEqual(expect.arrayContaining(["side", "modal", "ariaLabel"]));
    expect(plan.omissions).toEqual(expect.arrayContaining([
      "positioning: viewport-edge placement (side prop) unlowered",
      "modality: blocking backdrop and focus containment unlowered",
      "dismissal: escape, outside-click and close-button closing unlowered",
      "focus: focus trapping and containment unlowered",
      "focus: initial focus on part content unlowered",
      "focus: focus restoration to part trigger unlowered",
      "content: the content subtree is not projected into a native scene; consumers mount surface content",
    ]));
  });

  it("plans a transient toast and receipts its timer, timeout and live-region gaps", () => {
    const plan = planOf("Toast");
    expect(plan).toMatchObject({ anchor: "none", modality: "non-blocking", openTriggers: [] });
    expect(plan.excluded).toEqual(expect.arrayContaining(["title", "variant", "politeness", "duration"]));
    expect(plan.excluded).not.toContain("open");
    expect(plan.omissions).toEqual(expect.arrayContaining([
      "modality: non-blocking surface input isolation and modality state have no native mapping",
      "dismissal: escape, close-button and timeout closing unlowered",
      "dismissal: userDismiss trigger has no native handler",
      "transience: toast auto-dismiss timer unlowered (duration prop)",
      "a11y: the region role has no native accessibility projection",
      "content: the item subtree is not projected into a native scene; consumers mount surface content",
    ]));
  });

  it("plans a blocking command palette and receipts its search channel and filter props", () => {
    const plan = planOf("Command");
    expect(plan).toMatchObject({ anchor: "none", modality: "blocking", openTriggers: [] });
    expect(plan.excluded).toEqual(expect.arrayContaining([
      "defaultOpen", "search", "defaultSearch", "onSearchChange", "placeholder", "searchLabel", "emptyMessage", "label", "shouldFilter", "filter",
    ]));
    expect(plan.omissions).toEqual(expect.arrayContaining([
      "modality: blocking backdrop and focus containment unlowered",
      "interaction: search string channel and onSearchChange handler unlowered",
      "form: the text value model and input handling on part input unlowered",
      "form: native text readback (search) unlowered",
      "focus: declared manual focus strategy has no native focus policy",
      "focus: initial focus on part input unlowered",
      "positioning: centered placement unlowered",
    ]));
  });

  it("plans a part-anchored tooltip the narrow click gate does not own and receipts its anchoring gaps", () => {
    const plan = planOf("Tooltip");
    expect(plan).toMatchObject({ operation: "surface", anchor: "part", modality: "non-blocking", openTriggers: ["hover", "focus"] });
    expect(plan.excluded).toEqual(expect.arrayContaining(["defaultOpen", "placement", "disabled", "closeOnEscape", "closeOnBlur"]));
    expect(plan.omissions).toEqual(expect.arrayContaining([
      "anchor: tooltip positioning relative to its trigger unlowered",
      "anchor: declared anchored, describedby relation, flip-shift collision and placement prop not projected",
      "transience: ephemeral tooltip dismissal scheduling unlowered",
      "trigger: hover and focus opening has no native pointer or focus binding",
      "dismissal: escape, blur and pointer-leave closing unlowered",
      "dismissal: closeOnEscape and closeOnBlur gating unlowered",
      "interaction: open trigger on part trigger unlowered",
    ]));
  });

  it.each(SURFACE_FAMILIES)("carries a complete, duplicate-free receipt for %s", name => {
    const plan = planOf(name);
    expect(plan.operation).toBe("surface");
    // runtime/surface.gd is a PanelContainer subclass; the plan names the host
    // class so the generated scene and script cannot disagree.
    expect(plan.rootType).toBe("PanelContainer");
    expect(plan.excluded.length).toBeGreaterThan(0);
    expect(plan.omissions.length).toBeGreaterThan(plan.excluded.length);
    expect(new Set(plan.omissions).size).toBe(plan.omissions.length);
    expect(plan.omissions.every(line => line.trim().length > 0)).toBe(true);
    for (const prop of plan.excluded) {
      expect(plan.omissions).toContain(`${prop}: no executable native surface realization`);
    }
  });

  it("declines when the IR declares no surface", () => {
    expect(godotSurfacePlan(fixture("Switch"))).toBeUndefined();
    expect(godotSurfacePlan(fixture("Icon"))).toBeUndefined();
    expect(godotSurfacePlan(fixture("Card"))).toBeUndefined();
  });

  it("does not steal the narrow part-anchored, non-blocking, click-opened surface", () => {
    expect(godotSurfacePlan(fixture("Popover"))).toBeUndefined();
    expect(godotSurfacePlan(fixture("Popover", "UnrelatedAnchoredPanel"))).toBeUndefined();
  });

  it("dispatches on IR facts, not component identity", () => {
    const canonical = godotSurfacePlan(fixture("Dialog"));
    const renamed = godotSurfacePlan(fixture("Dialog", "UnrelatedOverlay"));
    expect(renamed).toEqual(canonical);
  });
});
