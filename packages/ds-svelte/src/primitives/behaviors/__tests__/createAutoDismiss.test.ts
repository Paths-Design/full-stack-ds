// Auto-dismiss budget proofs for the explicit-lifecycle Svelte behavior:
// sync() is the consumer-driven re-evaluation, destroy() the teardown.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutoDismiss } from "../createAutoDismiss.svelte.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("createAutoDismiss — timer semantics", () => {
  it("fires onDismiss once the budget elapses after sync", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const api = createAutoDismiss({
      open: () => true,
      durationMs: () => 5000,
      onDismiss,
    });
    api.sync();
    vi.advanceTimersByTime(4999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not start a timer when the surface is closed", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const api = createAutoDismiss({
      open: () => false,
      durationMs: () => 5000,
      onDismiss,
    });
    api.sync();
    vi.advanceTimersByTime(20000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("does not start a timer for a zero, null, or undefined budget", () => {
    vi.useFakeTimers();
    for (const durationMs of [() => 0, () => null, () => undefined]) {
      const onDismiss = vi.fn();
      const api = createAutoDismiss({
        open: () => true,
        durationMs: durationMs as () => number | null | undefined,
        onDismiss,
      });
      api.sync();
      vi.advanceTimersByTime(20000);
      expect(onDismiss).not.toHaveBeenCalled();
    }
  });

  it("a sync with unchanged inputs preserves the remaining budget", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const api = createAutoDismiss({
      open: () => true,
      durationMs: () => 5000,
      onDismiss,
    });
    api.sync();
    vi.advanceTimersByTime(4000);
    api.sync();
    vi.advanceTimersByTime(999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("createAutoDismiss — pause/resume budget", () => {
  it("pause freezes the remaining budget; resume grants only the remainder", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const api = createAutoDismiss({
      open: () => true,
      durationMs: () => 5000,
      onDismiss,
    });
    api.sync();
    vi.advanceTimersByTime(2000); // 3000 remaining
    api.pauseListeners.onpointerenter();
    vi.advanceTimersByTime(60000); // paused: no fire
    expect(onDismiss).not.toHaveBeenCalled();
    api.pauseListeners.onpointerleave();
    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("focusin pauses and focusout resumes", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const api = createAutoDismiss({
      open: () => true,
      durationMs: () => 5000,
      onDismiss,
    });
    api.sync();
    vi.advanceTimersByTime(2000);
    api.pauseListeners.onfocusin();
    vi.advanceTimersByTime(60000);
    expect(onDismiss).not.toHaveBeenCalled();
    api.pauseListeners.onfocusout();
    vi.advanceTimersByTime(3000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("pauseOnInteraction=false disables the pause listeners", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const api = createAutoDismiss({
      open: () => true,
      durationMs: () => 5000,
      onDismiss,
      pauseOnInteraction: false,
    });
    api.sync();
    api.pauseListeners.onpointerenter();
    vi.advanceTimersByTime(5000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("resume without a prior pause is a no-op", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const api = createAutoDismiss({
      open: () => true,
      durationMs: () => 5000,
      onDismiss,
    });
    api.sync();
    api.resume();
    vi.advanceTimersByTime(5000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("destroy clears the pending timer", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const api = createAutoDismiss({
      open: () => true,
      durationMs: () => 5000,
      onDismiss,
    });
    api.sync();
    api.destroy();
    vi.advanceTimersByTime(20000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
