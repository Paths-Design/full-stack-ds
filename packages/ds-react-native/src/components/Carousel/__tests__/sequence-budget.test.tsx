import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSequenceBudget, type SequenceOptions } from "../../../primitives/sequence-budget";

describe("native sequence budget", () => {
  let sequence: ReturnType<typeof createSequenceBudget>;
  let options: SequenceOptions;
  beforeEach(() => {
    vi.useFakeTimers();
    sequence = createSequenceBudget(vi.fn());
    options = { index: 0, labels: ["First", "Second", "Third"], childKeys: ["a", "b", "c"], durationMs: 1000, autoPlay: true, onIndexChange: vi.fn() };
    sequence.sync(options);
  });
  afterEach(() => { sequence.destroy(); vi.useRealTimers(); });
  it("projects elapsed time from the advancement deadline and waits for acknowledgement", () => {
    vi.advanceTimersByTime(400);
    expect(sequence.snapshot().elapsed).toBeCloseTo(0.4);
    vi.advanceTimersByTime(1600);
    expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    expect(sequence.snapshot().pending).toBe(true);
    sequence.rotate(false); sequence.rotate(true);
    vi.advanceTimersByTime(1000);
    expect(options.onIndexChange).toHaveBeenCalledTimes(1);
    options = { ...options, index: 1 };
    sequence.sync(options);
    expect(sequence.snapshot().elapsed).toBe(0);
    vi.advanceTimersByTime(999);
    expect(options.onIndexChange).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(options.onIndexChange).toHaveBeenLastCalledWith(2);
  });
  it("composes app, touch and transition pauses across invalid compositions", () => {
    vi.advanceTimersByTime(300);
    sequence.pause("app"); sequence.pause("touch"); sequence.pause("transition");
    sequence.sync({ ...options, labels: [] });
    sequence.sync(options);
    sequence.resume("app"); sequence.resume("touch");
    vi.advanceTimersByTime(4000);
    expect(options.onIndexChange).not.toHaveBeenCalled();
    sequence.resume("transition");
    vi.advanceTimersByTime(999);
    expect(options.onIndexChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
  });
  it("retains partial reading time across independent platform pauses", () => {
    vi.advanceTimersByTime(300);
    sequence.pause("app"); sequence.pause("blur");
    vi.advanceTimersByTime(5000);
    sequence.resume("app");
    vi.advanceTimersByTime(5000);
    expect(sequence.snapshot().elapsed).toBeCloseTo(0.3);
    sequence.resume("blur");
    vi.advanceTimersByTime(699);
    expect(options.onIndexChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
  });
  it("keeps focus stop until explicit start despite autoplay changes", () => {
    sequence.stop();
    sequence.sync({ ...options, autoPlay: false });
    sequence.sync(options);
    vi.advanceTimersByTime(2000);
    expect(options.onIndexChange).not.toHaveBeenCalled();
    sequence.rotate(true);
    vi.advanceTimersByTime(1000);
    expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
  });
  it("grants full dwell after movement and ignores an old completion after interruption", () => {
    sequence.sync({ ...options, index: 1 });
    const oldMotion = sequence.beginTransition();
    vi.advanceTimersByTime(500);
    sequence.sync({ ...options, index: 2 });
    const currentMotion = sequence.beginTransition();
    sequence.finishTransition(oldMotion);
    vi.advanceTimersByTime(5000);
    expect(options.onIndexChange).not.toHaveBeenCalled();
    sequence.finishTransition(currentMotion);
    vi.advanceTimersByTime(999);
    expect(options.onIndexChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(0);
  });
  it("keeps wrapped navigation direction and cancels stale clocks on removal", () => {
    sequence.request(-1);
    expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(2);
    sequence.sync({ ...options, index: 2 });
    expect(sequence.snapshot().direction).toBe(-1);
    sequence.request(3);
    expect(options.onIndexChange).toHaveBeenLastCalledWith(0);
    sequence.sync(options);
    expect(sequence.snapshot().direction).toBe(1);
    sequence.destroy();
    vi.advanceTimersByTime(5000);
    expect(options.onIndexChange).toHaveBeenCalledTimes(2);
  });
  it("restarts for replaced content but not newly allocated equal arrays", () => {
    vi.advanceTimersByTime(300);
    sequence.sync({ ...options, childKeys: [...options.childKeys], labels: [...options.labels] });
    expect(sequence.snapshot().elapsed).toBeCloseTo(0.3);
    sequence.sync({ ...options, childKeys: ["new", "b", "c"] });
    expect(sequence.snapshot().elapsed).toBe(0);
    vi.advanceTimersByTime(999);
    expect(options.onIndexChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
  });
  it.each([null, 0, -1, NaN, Infinity])("disables an invalid duration %s while manual navigation remains available", durationMs => {
    sequence.sync({ ...options, durationMs });
    vi.advanceTimersByTime(4000);
    expect(options.onIndexChange).not.toHaveBeenCalled();
    expect(sequence.snapshot().timed).toBe(false);
    sequence.request(1);
    expect(options.onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
  });
});
