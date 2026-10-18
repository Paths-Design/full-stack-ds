// @generated:start imports
import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Popover from "../Popover.vue";
import PopoverTrigger from "../PopoverTrigger.vue";
import PopoverContent from "../PopoverContent.vue";

declare module "vitest" {
  interface Assertion<T> {
    // The positional T keeps this augmentation mergeable with vitest's
    // own Assertion<T = any> declaration (TS2428 fires on any rename);
    // the expected param references it so it is never an unused type param.
    toHaveNoViolations(expected?: T): void;
  }
}
// @generated:end

// @generated:start tests
function mountDefault(rootProps: Record<string, unknown> = {}) {
  const Host = defineComponent({
    components: { Popover, PopoverTrigger, PopoverContent },
    props: {
      popoverProps: { type: Object, default: () => ({}) },
    },
    setup(props) {
      return () =>
        h(Popover, props.popoverProps as Record<string, unknown>, () => [
          h(PopoverTrigger, { "data-testid": "trigger" }, () => "Open"),
          h(PopoverContent, { "data-testid": "content" }, () => "Body"),
        ]);
    },
  });
  return mount(Host, {
    props: { popoverProps: rootProps },
    attachTo: document.body,
  });
}

// Content is teleported to document.body when open (anchoredPortalsContentToBody),
// so @vue/test-utils' `wrapper` never contains it — resolve from document.body.
function findContent() {
  return { exists: () => document.body.querySelector("[data-testid='content']") !== null,
    attributes: (key: string) => document.body.querySelector("[data-testid='content']")?.getAttribute(key) ?? undefined,
    element: document.body.querySelector("[data-testid='content']") as Element };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Popover — compound API surface", () => {
  it("renders the trigger but not the content when closed", () => {
    const wrapper = mountDefault();
    expect(wrapper.find("[data-testid='trigger']").exists()).toBe(true);
    expect(findContent().exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders the content when defaultOpen={true}", () => {
    const wrapper = mountDefault({ defaultOpen: true });
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("opens on click of the trigger", async () => {
    const wrapper = mountDefault();
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("toggles closed on a second click of the trigger", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(findContent().exists()).toBe(false);
    wrapper.unmount();
  });

  it("closes on Escape", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(false);
    wrapper.unmount();
  });

  it("wires aria-controls + aria-expanded on the trigger", () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    const content = findContent();
    const id = content.attributes("id");
    expect(id).toBeTruthy();
    expect(trigger.attributes("aria-controls")).toBe(id);
    expect(trigger.attributes("aria-expanded")).toBe("true");
    wrapper.unmount();
  });

  it("aria-expanded reflects closed state", () => {
    const wrapper = mountDefault();
    const trigger = wrapper.find("[data-testid='trigger']");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ onOpenChange: spy });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(spy).toHaveBeenCalledWith(true);
    wrapper.unmount();
  });

  it("respects disabled — click does not open", async () => {
    const wrapper = mountDefault({ disabled: true });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(findContent().exists()).toBe(false);
    wrapper.unmount();
  });

  it("unmount removes document-level listeners", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ defaultOpen: true, onOpenChange: spy });
    wrapper.unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("Popover — slot-props host adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", () => {
    const Host = defineComponent({
      components: { Popover, PopoverTrigger, PopoverContent },
      setup() {
        return () =>
          h(Popover, {}, () => [
            h(PopoverTrigger, { asChild: true }, {
              default: ({ triggerProps }: { triggerProps: Record<string, unknown> }) =>
                h("a", { ...triggerProps, href: "#open", "data-testid": "trigger" }, "Open"),
            }),
            h(PopoverContent, { "data-testid": "content" }, () => "Body"),
          ]);
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    const trigger = wrapper.find("[data-testid='trigger']");
    expect(trigger.element.tagName).toBe("A");
    wrapper.unmount();
  });

  it("asChild opens on click over the adopted child", async () => {
    const Host = defineComponent({
      components: { Popover, PopoverTrigger, PopoverContent },
      setup() {
        return () =>
          h(Popover, {}, () => [
            h(PopoverTrigger, { asChild: true }, {
              default: ({ triggerProps }: { triggerProps: Record<string, unknown> }) =>
                h("a", { ...triggerProps, href: "#open", "data-testid": "trigger" }, "Open"),
            }),
            h(PopoverContent, { "data-testid": "content" }, () => "Body"),
          ]);
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("asChild applies the data-popover-trigger marker to the adopted host", () => {
    const Host = defineComponent({
      components: { Popover, PopoverTrigger, PopoverContent },
      setup() {
        return () =>
          h(Popover, {}, () => [
            h(PopoverTrigger, { asChild: true }, {
              default: ({ triggerProps }: { triggerProps: Record<string, unknown> }) =>
                h("a", { ...triggerProps, href: "#open", "data-testid": "trigger" }, "Open"),
            }),
            h(PopoverContent, { "data-testid": "content" }, () => "Body"),
          ]);
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    expect(wrapper.find("[data-testid='trigger']").attributes("data-popover-trigger")).toBeDefined();
    wrapper.unmount();
  });
});

describe("Popover — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const wrapper = mountDefault();
    const results = (await axe(wrapper.element)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
    wrapper.unmount();
  });

  it("has no unexpected axe violations when open", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const results = (await axe(wrapper.element)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
    wrapper.unmount();
  });
});
// @generated:end

// @custom:start tests
// F-3B-1-B atom C-equivalent: deep behavioral coverage that proves
// the substrate generalization from F-3A atom A + F-3B-1-A
// (boundary-focusout in Vue substrate) works end-to-end for
// Popover. Lives in @custom because these behaviors are anchored
// to the popover surface shape, not kind-agnostic scaffolding.
//
// FEAT-ANCHORED-SURFACE-XFW-01: Popover content is now teleported to
// document.body when open (anchoredPortalsContentToBody), so
// @vue/test-utils' `wrapper` no longer contains the content node.
// All content lookups below resolve via `findContent()` (defined in
// the generated block above) instead of `wrapper.find(...)`.

describe("Popover — controlled mode", () => {
  it("open prop overrides internal state across re-render", async () => {
    const wrapper = mountDefault({ open: false });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(findContent().exists()).toBe(false);
    await wrapper.setProps({ popoverProps: { open: true } });
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("controlled open=true: click fires onOpenChange(false), content stays mounted", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ open: true, onOpenChange: spy });
    await wrapper.find("[data-testid='trigger']").trigger("click");
    expect(spy).toHaveBeenCalledWith(false);
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });
});

describe("Popover — outside-click dismissal", () => {
  it("closes on mousedown outside the surface", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const outside = document.createElement("button");
    outside.setAttribute("data-testid", "outside");
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(false);
    outside.remove();
    wrapper.unmount();
  });

  it("does NOT close on mousedown on the trigger", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    wrapper.find("[data-testid='trigger']").element.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("does NOT close on mousedown inside the content", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    findContent().element.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("closeOnOutsideClick={false} prevents outside-click dismissal", async () => {
    const wrapper = mountDefault({ defaultOpen: true, closeOnOutsideClick: false });
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
    outside.remove();
    wrapper.unmount();
  });
});

describe("Popover — boundary focus dismissal (F-3B-1-A substrate)", () => {
  function dispatchFocusOut(from: HTMLElement, to: EventTarget | null): void {
    from.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        cancelable: false,
        relatedTarget: to as EventTarget,
      }),
    );
  }

  it("stays open when focus moves trigger -> content", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']").element as HTMLElement;
    const content = findContent().element as HTMLElement;
    dispatchFocusOut(trigger, content);
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("stays open when focus moves content -> trigger", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']").element as HTMLElement;
    const content = findContent().element as HTMLElement;
    dispatchFocusOut(content, trigger);
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("closes when focus moves content -> outside", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const content = findContent().element as HTMLElement;
    dispatchFocusOut(content, outside);
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(false);
    outside.remove();
    wrapper.unmount();
  });

  it("closes when focus moves trigger -> outside", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const trigger = wrapper.find("[data-testid='trigger']").element as HTMLElement;
    dispatchFocusOut(trigger, outside);
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(false);
    outside.remove();
    wrapper.unmount();
  });

  it("closeOnBlur={false} prevents boundary-focusout dismissal", async () => {
    const wrapper = mountDefault({ defaultOpen: true, closeOnBlur: false });
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const trigger = wrapper.find("[data-testid='trigger']").element as HTMLElement;
    dispatchFocusOut(trigger, outside);
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
    outside.remove();
    wrapper.unmount();
  });
});

describe("Popover — closeOnEscape prop wiring", () => {
  it("closeOnEscape={false} prevents Escape dismissal", async () => {
    const wrapper = mountDefault({ defaultOpen: true, closeOnEscape: false });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });
});

// @custom:end
