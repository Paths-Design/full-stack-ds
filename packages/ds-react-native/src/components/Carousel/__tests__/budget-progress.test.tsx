import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { View } from "react-native";
import { BudgetProgress } from "../../../primitives/budget-progress";
import { useSequence } from "../../../primitives/useSequence";
import { AccessibilityInfo, AppState } from "../../../test-react-native";

const paint = { color: "#2463ba", trackColor: "#cccccc", steps: 10, thickness: 2 };
describe("native projections of the shared reading budget", () => {
  let tree: ReactTestRenderer;
  beforeEach(() => { vi.useFakeTimers(); AppState.currentState = "active"; });
  afterEach(async () => { if (tree) await act(async () => tree.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });
  const views = () => tree.root.findAll(node => String(node.type) === "View");
  const fillWidth = () => views().find(node => node.props.style.backgroundColor === paint.color)!.props.style.width;
  const rotations = () => views().filter(node => node.props.style.transform).map(node => node.props.style.transform[0].rotate);
  function Consumer({ advance }: { advance: (index: number) => void }) {
    const [index, setIndex] = useState(0);
    const sequence = useSequence({ index, labels: ["First", "Second"], durationMs: 1000, autoPlay: true,
      onIndexChange: value => { advance(value); setIndex(value); } }, [<View key="first" />, <View key="second" />]);
    return <>
      <BudgetProgress {...paint} effect="elapsed-width" elapsed={sequence.elapsed} reducedMotion={sequence.reducedMotion} width={100} height={4} />
      <BudgetProgress {...paint} effect="elapsed-ring" elapsed={sequence.elapsed} reducedMotion={sequence.reducedMotion} width={32} height={32} />
    </>;
  }
  it("keeps fill and ring aligned through pause and resets only when the budget advances", async () => {
    const advance = vi.fn();
    await act(async () => { tree = create(<Consumer advance={advance} />); });
    await act(async () => { vi.advanceTimersByTime(512); });
    expect(fillWidth()).toBeCloseTo(51.2);
    expect(rotations()[0]).toBe("0deg");
    expect(parseFloat(rotations()[1])).toBeCloseTo(4.32);
    await act(async () => { AppState.emit("change", "background"); vi.advanceTimersByTime(5000); });
    expect(fillWidth()).toBeCloseTo(51.2);
    expect(advance).not.toHaveBeenCalled();
    await act(async () => { AppState.emit("change", "active"); vi.advanceTimersByTime(487); });
    expect(advance).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(advance).toHaveBeenCalledExactlyOnceWith(1);
    expect(fillWidth()).toBe(0);
    expect(rotations()).toEqual(["-180deg", "0deg"]);
  });
  it("uses discrete reduced-motion progress without changing the advancement deadline", async () => {
    const advance = vi.fn();
    await act(async () => { tree = create(<Consumer advance={advance} />); });
    await act(async () => { vi.advanceTimersByTime(129); });
    await act(async () => { AccessibilityInfo.emit("reduceMotionChanged", true); });
    await act(async () => { vi.advanceTimersByTime(420); });
    expect(fillWidth()).toBe(50);
    expect(rotations()).toEqual(["0deg", "0deg"]);
    await act(async () => { vi.advanceTimersByTime(451); });
    expect(advance).toHaveBeenCalledExactlyOnceWith(1);
  });
  it("renders completion without scheduling time or exposing a second accessibility value", async () => {
    await act(async () => { tree = create(<BudgetProgress {...paint} effect="elapsed-ring" elapsed={1} reducedMotion={false} width={32} height={32} />); });
    expect(rotations()).toEqual(["0deg", "180deg"]);
    expect(views()[0].props).toMatchObject({ pointerEvents: "none", accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" });
    expect(vi.getTimerCount()).toBe(0);
  });
});
