import { describe, expect, it } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Modal } from "react-native";
import { Dialog } from "../Dialog";
import { Icon } from "../../Icon/Icon";

describe("Dialog dismissal policy", () => {
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
