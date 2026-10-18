// Auto-dismiss budget proofs — the composable is exercised indirectly
// through Toast/Select, but the pause/resume budget math and the disabled
// timer paths are only reachable directly.
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { useAutoDismiss } from "../useAutoDismiss";

function makeHost(
  opts: {
    open?: () => boolean;
    durationMs?: () => number | null | undefined;
    pauseOnInteraction?: boolean;
  } = {},
) {
  const onDismiss = vi.fn();
  const wrapper = mount(
    defineComponent({
      setup() {
        const api = useAutoDismiss({
          open: opts.open ?? (() => true),
          durationMs: opts.durationMs ?? (() => 5000),
          onDismiss,
          pauseOnInteraction: opts.pauseOnInteraction,
        });
        return () =>
          h("div", {
            onPointerenter: api.pauseListeners.pointerenter,
            onPointerleave: api.pauseListeners.pointerleave,
            onFocusin: api.pauseListeners.focusin,
            onFocusout: api.pauseListeners.focusout,
          });
      },
    }),
  );
  return { wrapper, onDismiss };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutoDismiss — timer semantics", () => {
  it("fires onDismiss once the budget elapses", async () => {
    vi.useFakeTimers();
    const { onDismiss } = makeHost();
    await vi.advanceTimersByTimeAsync(4999);
    expect(onDismiss).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not start a timer when the surface is closed", async () => {
    vi.useFakeTimers();
    const { onDismiss } = makeHost({ open: () => false });
    await vi.advanceTimersByTimeAsync(20000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("does not start a timer for a zero, null, or undefined budget", async () => {
    vi.useFakeTimers();
    for (const durationMs of [() => 0, () => null, () => undefined]) {
      const { onDismiss } = makeHost({ durationMs });
      await vi.advanceTimersByTimeAsync(20000);
      expect(onDismiss).not.toHaveBeenCalled();
    }
  });
});

describe("useAutoDismiss — pause/resume budget", () => {
  it("pause freezes the remaining budget; resume grants only the remainder", async () => {
    vi.useFakeTimers();
    const { wrapper, onDismiss } = makeHost();
    await vi.advanceTimersByTimeAsync(2000); // 3000 remaining
    wrapper.element.dispatchEvent(new Event("pointerenter"));
    await vi.advanceTimersByTimeAsync(60000); // paused: no fire
    expect(onDismiss).not.toHaveBeenCalled();
    wrapper.element.dispatchEvent(new Event("pointerleave"));
    await vi.advanceTimersByTimeAsync(2999);
    expect(onDismiss).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("focusin pauses and focusout resumes", async () => {
    vi.useFakeTimers();
    const { wrapper, onDismiss } = makeHost();
    await vi.advanceTimersByTimeAsync(2000);
    wrapper.element.dispatchEvent(new Event("focusin"));
    await vi.advanceTimersByTimeAsync(60000);
    expect(onDismiss).not.toHaveBeenCalled();
    wrapper.element.dispatchEvent(new Event("focusout"));
    await vi.advanceTimersByTimeAsync(3000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("pauseOnInteraction=false disables the pause listeners", async () => {
    vi.useFakeTimers();
    const { wrapper, onDismiss } = makeHost({ pauseOnInteraction: false });
    wrapper.element.dispatchEvent(new Event("pointerenter"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("resume without a prior pause is a no-op", async () => {
    vi.useFakeTimers();
    const { wrapper, onDismiss } = makeHost();
    wrapper.element.dispatchEvent(new Event("pointerleave"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("clears the pending timer on unmount", async () => {
    vi.useFakeTimers();
    const { wrapper, onDismiss } = makeHost();
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(20000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
