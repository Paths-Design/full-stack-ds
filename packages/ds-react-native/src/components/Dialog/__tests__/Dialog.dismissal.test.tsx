import { describe, expect, it } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Modal } from "react-native";
import { Dialog } from "../Dialog";
import { Icon } from "../../Icon/Icon";
import { FsdsMessagesProvider } from "../../../primitives/messages";

describe("Dialog dismissal policy", () => {
  it("labels visible close chrome from the catalog and lets a controlled owner refuse", () => {
    const seen: boolean[] = [];
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<FsdsMessagesProvider messages={{ Dialog: { close: "Fermer la fenêtre" } }}><Dialog open onOpenChange={value => seen.push(value)}>Body</Dialog></FsdsMessagesProvider>); });
    const icon = renderer.root.findByType(Icon);
    expect(icon.props).toMatchObject({ name: "x", size: "sm" });
    const button = renderer.root.findAll(node => typeof node.type === "string" && node.props.accessibilityRole === "button" && node.props.accessibilityLabel === "Fermer la fenêtre");
    expect(button).toHaveLength(1);
    act(() => button[0].props.onPress());
    expect(seen).toEqual([false]);
    expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    act(() => renderer.unmount());
  });

  it("closes uncontrolled state through the same visible action", () => {
    const seen: boolean[] = [];
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Dialog defaultOpen onOpenChange={value => seen.push(value)}>Body</Dialog>); });
    expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    const button = renderer.root.findAll(node => typeof node.type === "string" && node.props.accessibilityRole === "button" && node.props.accessibilityLabel === "Close dialog");
    expect(button).toHaveLength(1);
    act(() => button[0].props.onPress());
    expect(seen).toEqual([false]);
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
    act(() => renderer.unmount());
  });
  it.each([[false, false], [false, true], [true, false], [true, true]] as const)("gates backdrop requests with dismissible=%s and closeOnBackdropClick=%s", (dismissible, closeOnBackdropClick) => {
    const seen: boolean[] = [];
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Dialog open dismissible={dismissible} closeOnBackdropClick={closeOnBackdropClick} onOpenChange={value => seen.push(value)}>Body</Dialog>); });
    const overlay = renderer.root.findAll(node => typeof node.type === "string" && node.props.accessible === false && typeof node.props.onPress === "function").at(-1);
    expect(overlay).toBeDefined();
    act(() => { overlay!.props.onPress(); });
    expect(seen).toEqual(dismissible && closeOnBackdropClick ? [false] : []);
    expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    expect(renderer.root.findAllByType(Icon)).toHaveLength(dismissible ? 1 : 0);
    act(() => renderer.unmount());
  });

  it.each([true, false])("governs system close independently with closeOnEscape=%s", closeOnEscape => {
    const seen: boolean[] = [];
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Dialog open dismissible={false} closeOnEscape={closeOnEscape} onOpenChange={value => seen.push(value)}>Body</Dialog>); });
    act(() => renderer.root.findByType(Modal).props.onRequestClose());
    expect(seen).toEqual(closeOnEscape ? [false] : []);
    expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    act(() => renderer.unmount());
  });
});
