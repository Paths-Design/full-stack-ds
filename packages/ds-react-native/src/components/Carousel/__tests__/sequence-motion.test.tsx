import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Text } from "react-native";
import { useSequence, SequenceChildren } from "../../../primitives/useSequence";
import { Animated, AccessibilityInfo, I18nManager } from "../../../test-react-native";

// Boundary witness: executes the sequence adapter, records requests to RN's
// animation API. It does not observe pixels or execute the native driver.
describe("native sequence movement ownership", () => {
  let tree: ReactTestRenderer;
  let sequence: ReturnType<typeof useSequence>;
  const profile = { durationMs: 250, easing: "cubic-bezier(0.4, 0, 0.2, 1)", referenceWidth: 320, minMultiplier: 0.5, maxMultiplier: 2 };
  function Consumer() {
    const [index, setIndex] = useState(0);
    sequence = useSequence({ index, labels: ["First", "Second", "Third"], autoPlay: true, durationMs: 1000, onIndexChange: setIndex }, [<Text key="a">First</Text>, <Text key="b">Second</Text>, <Text key="c">Third</Text>], profile);
    return <SequenceChildren sequence={sequence} labels={["First", "Second", "Third"]} />;
  }
  beforeEach(() => { vi.useFakeTimers(); Animated.motions.length = 0; I18nManager.isRTL = false; });
  afterEach(async () => { if (tree) await act(async () => tree.unmount()); vi.useRealTimers(); });
  async function mount(width: number) {
    await act(async () => { tree = create(<Consumer />); });
    await act(async () => tree.root.find(node => String(node.type) === "View" && Boolean(node.props.onLayout)).props.onLayout({ nativeEvent: { layout: { width } } }));
  }
  it.each([[320, 250], [1280, 500]])("uses native directional transforms and %ims width timing", async (width, duration) => {
    await mount(width);
    await act(async () => sequence.next());
    expect(Animated.motions.map(item => [item.config.toValue, item.config.duration])).toEqual([[-width, duration], [0, duration]]);
    expect(sequence.paused).toBe(true);
    await act(async () => { vi.advanceTimersByTime(duration); });
    expect(sequence.paused).toBe(false);
    expect(sequence.elapsed).toBe(0);
    await act(async () => { vi.advanceTimersByTime(999); });
    expect(sequence.index).toBe(1);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(sequence.index).toBe(2);
  });
  it("reverses an interrupted pair and skips movement after reduced motion changes", async () => {
    await mount(320);
    await act(async () => sequence.next());
    await act(async () => sequence.previous());
    expect(Animated.motions.slice(-2).map(item => item.config.toValue)).toEqual([320, 0]);
    await act(async () => AccessibilityInfo.emit("reduceMotionChanged", true));
    expect(sequence.paused).toBe(false);
    const count = Animated.motions.length;
    await act(async () => sequence.previous());
    expect(sequence.index).toBe(2);
    expect(Animated.motions).toHaveLength(count);
  });
  it("projects logical forward movement rightward for RTL and cancels on unmount", async () => {
    I18nManager.isRTL = true;
    await mount(320);
    await act(async () => sequence.next());
    expect(Animated.motions[0].config.toValue).toBe(320);
    await act(async () => tree.unmount());
    expect(vi.getTimerCount()).toBe(0);
  });
});
