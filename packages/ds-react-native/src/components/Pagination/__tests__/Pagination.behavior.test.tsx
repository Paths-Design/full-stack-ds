import { describe, expect, it, vi } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Pagination } from "../Pagination";

const items = (renderer: ReactTestRenderer) => renderer.root.findAll(node =>
  String(node.type) === "Pressable" && node.props.accessibilityRole === "button");

describe("Pagination accepted position", () => {
  it("projects uncontrolled selection into the native accessibility state", () => {
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Pagination pages={["Same", "Same", "Same"]} defaultIndex={1} />); });
    expect(items(renderer).map(item => item.props.accessibilityState.selected)).toEqual([false, true, false]);
    act(() => items(renderer)[2].props.onPress());
    expect(items(renderer).map(item => item.props.accessibilityState.selected)).toEqual([false, false, true]);
    act(() => renderer.unmount());
  });
  it("keeps controlled selection pinned until the consumer acknowledges", () => {
    const onIndexChange = vi.fn();
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<Pagination pages={["1", "2"]} index={0} onIndexChange={onIndexChange} />); });
    act(() => items(renderer)[1].props.onPress());
    expect(onIndexChange.mock.calls).toEqual([[1]]);
    expect(items(renderer).map(item => item.props.accessibilityState.selected)).toEqual([true, false]);
    act(() => renderer.update(<Pagination pages={["1", "2"]} index={1} onIndexChange={onIndexChange} />));
    expect(items(renderer).map(item => item.props.accessibilityState.selected)).toEqual([false, true]);
    act(() => renderer.unmount());
  });
});
