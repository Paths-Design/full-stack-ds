import { describe, expect, it, vi } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { PageNavigator, type PageNavigatorProps } from "../PageNavigator";

const pages = ["Intro", "Setup", "Review"];

const button = (renderer: ReactTestRenderer, label: string) => renderer.root.find(node =>
  String(node.type) === "Pressable" && node.props.accessibilityLabel === label);
const field = (renderer: ReactTestRenderer) => renderer.root.find(node =>
  String(node.type) === "TextInput" && node.props.accessibilityLabel === "Current page");

function mount(props: PageNavigatorProps = {}) {
  const onIndexChange = vi.fn();
  let renderer!: ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<PageNavigator pages={pages} onIndexChange={onIndexChange} {...props} />); });
  return { renderer, onIndexChange };
}

describe("PageNavigator bounded navigation", () => {
  it("steps the accepted position one page at a time and refuses to leave the page range", () => {
    const { renderer, onIndexChange } = mount();
    expect(button(renderer, "Previous page").props.accessibilityState.disabled).toBe(true);
    act(() => button(renderer, "Previous page").props.onPress());
    expect(onIndexChange).not.toHaveBeenCalled();

    act(() => button(renderer, "Next page").props.onPress());
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(field(renderer).props.value).toBe("2");
    act(() => button(renderer, "Next page").props.onPress());
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    expect(button(renderer, "Next page").props.accessibilityState.disabled).toBe(true);
    act(() => button(renderer, "Next page").props.onPress());
    expect(onIndexChange).toHaveBeenCalledTimes(2);

    act(() => button(renderer, "Previous page").props.onPress());
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(field(renderer).props.value).toBe("2");
    act(() => renderer.unmount());
  });

  it("keeps a controlled position pinned until the parent acknowledges the request", () => {
    const { renderer, onIndexChange } = mount({ index: 1 });
    expect(field(renderer).props.value).toBe("2");
    act(() => button(renderer, "Next page").props.onPress());
    expect(onIndexChange.mock.calls).toEqual([[2]]);
    expect(field(renderer).props.value).toBe("2");
    act(() => renderer.update(<PageNavigator pages={pages} index={2} onIndexChange={onIndexChange} />));
    expect(field(renderer).props.value).toBe("3");
    expect(button(renderer, "Next page").props.accessibilityState.disabled).toBe(true);
    act(() => renderer.unmount());
  });
});

describe("PageNavigator one-based page field", () => {
  it("commits a typed page number as the zero-based position it names", () => {
    const { renderer, onIndexChange } = mount();
    expect(field(renderer).props.value).toBe("1");
    act(() => field(renderer).props.onChangeText("3"));
    expect(field(renderer).props.value).toBe("3");
    expect(onIndexChange).not.toHaveBeenCalled();
    act(() => button(renderer, "Go").props.onPress());
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(2);
    expect(field(renderer).props.value).toBe("3");
    act(() => renderer.unmount());
  });

  it.each(["0", "4", "two", ""])("rejects %j and restores the accepted page in the field", entry => {
    const { renderer, onIndexChange } = mount({ defaultIndex: 1 });
    act(() => field(renderer).props.onChangeText(entry));
    act(() => button(renderer, "Go").props.onPress());
    expect(onIndexChange).not.toHaveBeenCalled();
    expect(field(renderer).props.value).toBe("2");
    act(() => renderer.unmount());
  });

  it("ignores edits and commits while disabled", () => {
    const { renderer, onIndexChange } = mount({ disabled: true });
    expect(field(renderer).props.editable).toBe(false);
    act(() => field(renderer).props.onChangeText("3"));
    act(() => button(renderer, "Go").props.onPress());
    expect(onIndexChange).not.toHaveBeenCalled();
    expect(field(renderer).props.value).toBe("1");
    act(() => renderer.unmount());
  });
});
