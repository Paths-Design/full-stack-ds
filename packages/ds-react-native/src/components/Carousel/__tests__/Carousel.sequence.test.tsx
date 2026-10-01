import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, StrictMode, useState } from "react";
import { Carousel } from "../Carousel";
import { Card } from "../../Card/Card";
import { FsdsThemeProvider } from "../../../tokens";
import { MotionPart } from "../../../primitives/motion-parts";
import { SequenceViewport } from "../../../primitives/sequence-motion";
import { AccessibilityInfo, AppState, Animated, nativeAnimationProbe } from "../../../test-react-native";

describe("generated native sequence controls", () => {
  let tree: ReactTestRenderer;
  beforeEach(() => { vi.useFakeTimers(); AppState.currentState = "active"; Animated.motions.length = 0; nativeAnimationProbe.reset(); });
  afterEach(async () => { if (tree) await act(async () => tree.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });
  const controls = () => tree.root.findAll(node => String(node.type) === "Pressable");
  const control = (label: string) => controls().find(node => node.props.accessibilityLabel === label)!;
  const slide = (label: string) => tree.root.findAll(node => String(node.type) === "View").find(node => node.props.accessibilityLabel === label)!;
  const viewport = () => tree.root.findByType(SequenceViewport).find(node => String(node.type) === "View" && Boolean(node.props.onLayout));
  const children = ["First", "Second", "Third"].map(label => createElement(Card, { key: label }, label));
  async function mount(props: Parameters<typeof Carousel>[0] = {}) {
    await act(async () => { tree = create(<StrictMode><Carousel slides={["First", "Second", "Third"]} {...props}>{children}</Carousel></StrictMode>); });
  }
  async function press(label: string) { await act(async () => control(label).props.onPress()); }
  it.each([null, 0, -1, NaN, Infinity])("omits rotation for disabled duration %s while retaining manual navigation", async duration => {
    await mount({ autoPlay: true, duration });
    expect(controls().map(node => node.props.accessibilityLabel)).not.toContain("Stop slide rotation");
    expect(controls().map(node => node.props.accessibilityLabel)).not.toContain("Start slide rotation");
    await press("Next slide");
    expect(slide("Second").props.importantForAccessibility).toBe("auto");
    await act(async () => { vi.advanceTimersByTime(20000); });
    expect(slide("Second").props.importantForAccessibility).toBe("auto");
  });
  it("restores rotation when a disabled timer becomes enabled and keeps invalid content disabled", async () => {
    await mount({ duration: null });
    await act(async () => tree.update(<StrictMode><Carousel slides={["First", "Second", "Third"]} duration={1000}>{children}</Carousel></StrictMode>));
    expect(control("Start slide rotation").props.disabled).toBe(false);
    await press("Start slide rotation");
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(slide("Second").props.importantForAccessibility).toBe("auto");
    await act(async () => tree.update(<StrictMode><Carousel slides={["First"]} duration={1000}>{children}</Carousel></StrictMode>));
    expect(control("Stop slide rotation").props.disabled).toBe(true);
    expect(control("Next slide").props.disabled).toBe(true);
  });
  it("binds both decorations to one budget across the composed picker boundary", async () => {
    await mount({ autoPlay: true, duration: 1000, indicator: "both" });
    await act(async () => { vi.advanceTimersByTime(400); });
    const parts = () => tree.root.findAllByType(MotionPart);
    expect(parts()).toHaveLength(4);
    const fill = parts().filter(part => part.props.projection.effect === "elapsed-width");
    const ring = parts().find(part => part.props.projection.effect === "elapsed-ring")!;
    expect(fill.map(part => part.props.index)).toEqual([0, 1, 2]);
    expect(fill[0].props.projection).toMatchObject({ activeIndex: 0, visible: true });
    expect(fill[0].props.projection.elapsed).toBeCloseTo(0.4, 1);
    expect(ring.props.projection.elapsed).toBe(fill[0].props.projection.elapsed);
    await act(async () => AccessibilityInfo.emit("reduceMotionChanged", true));
    expect(parts().every(part => part.props.projection.reducedMotion)).toBe(true);
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(parts()[0].props.projection.activeIndex).toBe(1);
    expect(parts()[0].props.projection.elapsed).toBe(0);
  });
  it.each([[320, 250], [1280, 500]])("animates generated content at width %i and starts its dwell after settlement", async (width, duration) => {
    await mount({ autoPlay: true, duration: 1000 });
    await act(async () => viewport().props.onLayout({ nativeEvent: { layout: { width } } }));
    await press("Next slide");
    expect(Animated.motions.map(motion => [motion.config.toValue, motion.config.duration])).toEqual([[-width, duration], [0, duration]]);
    expect(slide("First").props.style.display).toBe("flex");
    expect(slide("First").props.importantForAccessibility).toBe("no-hide-descendants");
    await act(async () => { vi.advanceTimersByTime(duration); });
    expect(slide("First").props.style.display).toBe("none");
    await act(async () => { vi.advanceTimersByTime(999); });
    expect(slide("Second").props.importantForAccessibility).toBe("auto");
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(slide("Third").props.importantForAccessibility).toBe("auto");
  });
  it("consumes a theme movement token independently of dwell and honors live reduced motion", async () => {
    await act(async () => { tree = create(<FsdsThemeProvider value={{ tokens: { "carousel.motion.duration": "400ms" } }}><Carousel slides={["First", "Second", "Third"]} autoPlay duration={1000}>{children}</Carousel></FsdsThemeProvider>); });
    await act(async () => viewport().props.onLayout({ nativeEvent: { layout: { width: 320 } } }));
    await press("Next slide");
    expect(Animated.motions.map(motion => motion.config.duration)).toEqual([400, 400]);
    await act(async () => AccessibilityInfo.emit("reduceMotionChanged", true));
    expect(slide("First").props.style.display).toBe("none");
    await press("Previous slide");
    expect(Animated.motions).toHaveLength(2);
    expect(slide("First").props.importantForAccessibility).toBe("auto");
  });
  it("routes composed picker requests through sequence direction and controlled acknowledgement", async () => {
    const onIndexChange = vi.fn();
    await mount({ index: 0, onIndexChange, autoPlay: true, duration: 1000 });
    await press("Third");
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(2);
    expect(slide("First").props.importantForAccessibility).toBe("auto");
  });
  it("navigates real generated children and preserves mounted consumer state", async () => {
    function Child() {
      const [count, setCount] = useState(0);
      return createElement("consumer", { count, increment: () => setCount(count + 1) });
    }
    await act(async () => { tree = create(<Carousel slides={["First", "Second"]}><Child key="a" /><Card key="b">Second</Card></Carousel>); });
    await act(async () => tree.root.find(node => String(node.type) === "consumer").props.increment());
    await press("Next slide");
    expect(slide("First").props.importantForAccessibility).toBe("no-hide-descendants");
    expect(slide("Second").props.style.display).toBe("flex");
    await press("Previous slide");
    expect(tree.root.find(node => String(node.type) === "consumer").props.count).toBe(1);
    expect(slide("First").props.style.display).toBe("flex");
  });
  it("stops through native press-in/focus/press ordering and restarts explicitly", async () => {
    await mount({ autoPlay: true, duration: 1000 });
    await act(async () => {
      const button = control("Stop slide rotation");
      button.props.onPressIn(); button.props.onFocus(); button.props.onPress();
    });
    expect(control("Start slide rotation").props.disabled).toBe(false);
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(slide("First").props.style.display).toBe("flex");
    await press("Start slide rotation");
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(slide("Second").props.style.display).toBe("flex");
  });
  it("waits for a controlled acknowledgement without repeating callbacks", async () => {
    const onIndexChange = vi.fn();
    await mount({ index: 0, onIndexChange, autoPlay: true, duration: 1000 });
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    expect(slide("First").props.style.display).toBe("flex");
  });
  it("preserves dwell across app background and Android blur and removes subscriptions", async () => {
    await mount({ autoPlay: true, duration: 1000 });
    await act(async () => {
      vi.advanceTimersByTime(300);
      AppState.emit("change", "background"); AppState.emit("blur", "");
      vi.advanceTimersByTime(5000);
      AppState.emit("change", "active");
      vi.advanceTimersByTime(1000);
    });
    expect(slide("First").props.style.display).toBe("flex");
    await act(async () => { AppState.emit("focus", ""); vi.advanceTimersByTime(699); });
    expect(slide("First").props.style.display).toBe("flex");
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(slide("Second").props.style.display).toBe("flex");
    await act(async () => tree.unmount());
    expect(AppState.listenerCount()).toBe(0);
    expect(AccessibilityInfo.listenerCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("waits for initial accessibility preferences and ignores stale initial query results", async () => {
    let resolve!: (value: boolean) => void;
    vi.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockImplementation(() => new Promise(done => { resolve = done; }));
    await mount({ autoPlay: true, duration: 1000 });
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(slide("First").props.style.display).toBe("flex");
    await act(async () => { AccessibilityInfo.emit("screenReaderChanged", true); resolve(false); });
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(control("Start slide rotation").props.disabled).toBe(false);
    expect(slide("First").props.style.display).toBe("flex");
  });
});
