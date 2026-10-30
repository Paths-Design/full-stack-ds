import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../ir.js";
import { nativeCloseActions } from "./native-surface-actions.js";
import { emitCenteredSurface } from "./jetpack-compose/emitters/surfaces.js";
import { generateSwiftUISurfaceFiles } from "./swift/swiftui/surface-emit.js";
import { swiftSurfaceReference } from "./swift/swiftui/reference-call.js";

function fixture() {
  const folder = resolve(__dirname, "../../../ds-contracts/components/Dialog");
  const contract = JSON.parse(readFileSync(resolve(folder, "Dialog.contract.json"), "utf8"));
  contract.tokens = JSON.parse(readFileSync(resolve(folder, "Dialog.tokens.json"), "utf8"));
  contract.styles = JSON.parse(readFileSync(resolve(folder, "Dialog.styles.json"), "utf8"));
  return buildComponentIR(contract);
}

describe("native referenced close actions", () => {
  it("carries activation, guard, localized name, referenced glyph and declared hit geometry", () => {
    const ir = fixture(), channel = ir.behavior.normalizedChannels[0];
    const actions = nativeCloseActions(ir, channel, "ios");
    expect(actions).toHaveLength(1);
    const [action] = actions;
    expect(action.guard?.name).toBe("dismissible");
    expect(action.dimensions).toEqual({ width: { pixels: 32, token: "dialog.size.closeButton.size", designSlot: "dialog.design.close-button.sizing.width" }, height: { pixels: 32, token: "dialog.size.closeButton.size", designSlot: "dialog.design.close-button.sizing.height" } });
    expect(action.label.message.catalogKey).toBe("Dialog.close");
    expect(action.references[0].attrs).toMatchObject({ name: "x", size: "sm" });
    const compose = emitCenteredSurface(ir), swift = generateSwiftUISurfaceFiles(ir).componentFile;
    expect(compose).toContain("dismissOnClickOutside = dismissible && closeOnBackdropClick");
    expect(compose).toContain("dismissOnBackPress = closeOnEscape");
    expect(compose).toContain("if (dismissible)");
    expect(compose).toContain("size = IconSize.Sm");
    expect(compose).toContain("clearAndSetSemantics");
    expect(compose).toContain('.width(fsdsTheme.tokens["dialog.design.close-button.sizing.width"]?.toFsdsDp() ?: layeredSlot("dialog.size.closeButton.size")?.toFsdsDp() ?: 32.dp)');
    expect(swift).toContain('DsSwiftUI.Icon(name: "x", size: .sm).accessibilityHidden(true)');
    expect(swift).toContain('SwiftUI.Button(action: { open.set(false) })');
    expect(swift).toContain('.frame(width: fsdsTheme.tokens["dialog.design.close-button.sizing.width"]?.px ?? pxSlot("dialog.size.closeButton.size") ?? 32, height: fsdsTheme.tokens["dialog.design.close-button.sizing.height"]?.px ?? pxSlot("dialog.size.closeButton.size") ?? 32)');
    expect(swift).toContain('fsdsMessages.string("Dialog.close"');
  });

  it("uses normalized names and excludes wrong-channel or non-close activations", () => {
    const ir = fixture(), channel = ir.behavior.normalizedChannels[0];
    const action = nativeCloseActions(ir, channel, "ios")[0];
    ir.name = "RenamedSurface";
    channel.name = "visibility";
    action.node.part = "exitAction";
    action.guard!.name = "allowExit";
    action.guard!.safeName = "allowExit";
    action.node.ifProp = "allowExit";
    action.node.ifNegated = true;
    ir.styledProps.push({ ...action.guard!, name: "locked", safeName: "locked", defaultExpr: "false" });
    action.node.bindings.disabled = { kind: "prop", prop: "locked" };
    const source = generateSwiftUISurfaceFiles(ir).componentFile;
    expect(source).toContain("if (!allowExit)");
    expect(source).toContain(".disabled(locked)");
    expect(nativeCloseActions(ir, { ...channel, name: "other" }, "ios")).toHaveLength(0);
    action.node.activation!.operation = "open";
    expect(nativeCloseActions(ir, channel, "ios")).toHaveLength(0);
  });

  it("rejects unsupported action/reference facts instead of emitting inert props", () => {
    const ir = fixture(), channel = ir.behavior.normalizedChannels[0];
    const action = nativeCloseActions(ir, channel, "ios")[0];
    action.node.bindings.disabled = { kind: "literal", value: "true" };
    expect(() => nativeCloseActions(ir, channel, "ios")).toThrow(/disabled binding/);
    action.references[0].attrs.unadmitted = "value";
    expect(() => swiftSurfaceReference(action.references[0])).toThrow(/no admitted lowering/);
  });

  it("honors dimension platform facts and rejects unsupported conditional geometry", () => {
    const ir = fixture(), channel = ir.behavior.normalizedChannels[0];
    const action = nativeCloseActions(ir, channel, "ios")[0];
    const rule = ir.nativeStyleRules!.rules.find(rule => rule.part === action.node.part)!;
    const width = rule.declarations.find(declaration => declaration.property === "width")!;
    width.platforms = ["ios"];
    expect(nativeCloseActions(ir, channel, "ios")[0].dimensions.width?.pixels).toBe(32);
    expect(nativeCloseActions(ir, channel, "android")[0].dimensions.width).toBeUndefined();
    rule.predicates.push({ kind: "disabled", value: true });
    expect(() => nativeCloseActions(ir, channel, "ios")).toThrow(/conditional dimensions/);
  });
});
