// @generated:start imports
import { describe, expect, it, vi } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Modal } from "react-native";
import { Toast } from "../Toast";
// @generated:end

// @generated:start tests
describe("Toast React Native", () => {
  it("renders a non-blocking live region without a modal host", () => {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<Toast open politeness="assertive" testID="subject">Body</Toast>);
  });
    expect(renderer!.root.findAllByType(Modal)).toHaveLength(0);
    expect(renderer!.root.findAll((node) => node.props.accessibilityLiveRegion === "assertive").length).toBeGreaterThan(0);
    expect(renderer!.root.findAll((node) => typeof node.type === "string" && node.props.children === "Body").length).toBeGreaterThan(0);
  });
  it("hides content when the open channel is false", () => {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<Toast open={false} testID="subject">Body</Toast>);
  });
    expect(renderer!.root.findAll((node) => typeof node.type === "string" && node.props.children === "Body")).toHaveLength(0);
  });
  it("auto-dismisses after the token presence budget elapses", () => {
    vi.useFakeTimers();
    const seen: boolean[] = [];
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<Toast open onOpenChange={(next: boolean) => seen.push(next)} testID="subject">Body</Toast>);
  });
    act(() => { vi.advanceTimersByTime(5999); });
    expect(seen).toEqual([]);
    act(() => { vi.advanceTimersByTime(1); });
    expect(seen).toEqual([false]);
    renderer?.unmount();
    vi.useRealTimers();
  });
  it("never auto-dismisses when duration is null", () => {
    vi.useFakeTimers();
    const seen: boolean[] = [];
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<Toast open duration={null} onOpenChange={(next: boolean) => seen.push(next)} testID="subject">Body</Toast>);
  });
    act(() => { vi.advanceTimersByTime(600000); });
    expect(seen).toEqual([]);
    renderer?.unmount();
    vi.useRealTimers();
  });
});
// @generated:end
