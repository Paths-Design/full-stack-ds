// Direct focus-trap behavior proofs for the Vue composable. The trap is
// also exercised indirectly through Dialog/Tooltip/Select, but the cycle,
// wrap, and restore edge paths are only reachable here.
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, ref } from "vue";
import { useFocusTrap } from "../useFocusTrap";

function makeHost(initialTarget?: HTMLElement, returnTarget?: HTMLElement) {
  const active = ref(false);
  const containerRef = ref<HTMLElement | null>(null);
  const wrapper = mount(
    defineComponent({
      setup() {
        useFocusTrap(containerRef, {
          active: computed(() => active.value),
          initialFocusRef: initialTarget ? ref(initialTarget) : undefined,
          returnFocusRef: returnTarget ? ref(returnTarget) : undefined,
        });
        return () =>
          h("div", { ref: containerRef, "data-testid": "trap" }, [
            h("button", { "data-testid": "first" }, "first"),
            h("input", { "data-testid": "mid" }),
            h("button", { "data-testid": "last" }, "last"),
          ]);
      },
    }),
    { attachTo: document.body },
  );
  const container = () => wrapper.get('[data-testid="trap"]').element as HTMLElement;
  const first = () => wrapper.get('[data-testid="first"]').element as HTMLElement;
  const last = () => wrapper.get('[data-testid="last"]').element as HTMLElement;
  const tab = (shift = false) =>
    container().dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true }),
    );
  return { active, wrapper, container, first, last, tab };
}

describe("useFocusTrap — activation and focus management", () => {
  it("focuses the first focusable when activated", async () => {
    const { active, first } = makeHost();
    active.value = true;
    await Promise.resolve();
    expect(document.activeElement).toBe(first());
  });

  it("focuses the initialFocusRef element when provided", async () => {
    const target = document.createElement("button");
    const { active, container } = makeHost(target);
    container().appendChild(target);
    active.value = true;
    await Promise.resolve();
    expect(document.activeElement).toBe(target);
    target.remove();
  });

  it("rejects an initial ref outside the trapped panel", async () => {
    const target = document.createElement("button");
    document.body.appendChild(target);
    const { active, first } = makeHost(target);
    active.value = true;
    await Promise.resolve();
    expect(document.activeElement).toBe(first());
    target.remove();
  });

  it("leaves focus alone while inactive", async () => {
    const { active, first } = makeHost();
    active.value = false;
    await Promise.resolve();
    expect(document.activeElement).not.toBe(first());
  });

  it("does not intercept non-Tab keys", () => {
    const { container, tab, first } = makeHost();
    container().dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(document.activeElement).not.toBe(first());
    void tab;
  });
});

describe("useFocusTrap — tab cycling", () => {
  it("wraps forward from the last focusable to the first", async () => {
    const { active, first, last, tab } = makeHost();
    active.value = true;
    await Promise.resolve();
    last().focus();
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    const container = last().closest('[data-testid="trap"]') as HTMLElement;
    container.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first());
    void tab;
  });

  it("wraps backward from the first focusable to the last", async () => {
    const { active, first, last, tab } = makeHost();
    active.value = true;
    await Promise.resolve();
    first().focus();
    const container = first().closest('[data-testid="trap"]') as HTMLElement;
    const ev = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last());
    void tab;
  });

  it("does not preventDefault for a Tab from a middle focusable", async () => {
    const { active, container, tab } = makeHost();
    active.value = true;
    await Promise.resolve();
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    container().dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    void tab;
  });
});

describe("useFocusTrap — restoration and teardown", () => {
  it("restores the previously focused element on deactivation", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { active, first } = makeHost();
    active.value = true;
    await Promise.resolve();
    expect(document.activeElement).toBe(first());
    active.value = false;
    await Promise.resolve();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("prefers the returnFocusRef element on deactivation", async () => {
    const target = document.createElement("button");
    document.body.appendChild(target);
    const { active, first } = makeHost(undefined, target);
    active.value = true;
    await Promise.resolve();
    expect(document.activeElement).toBe(first());
    active.value = false;
    await Promise.resolve();
    expect(document.activeElement).toBe(target);
    target.remove();
  });

  it("stops intercepting keys after unmount", async () => {
    const { active, wrapper, container } = makeHost();
    active.value = true;
    await Promise.resolve();
    wrapper.unmount();
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    container().dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
});
