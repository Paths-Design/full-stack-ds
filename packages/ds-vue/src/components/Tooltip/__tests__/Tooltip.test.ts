// @generated:start imports
import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Tooltip from "../Tooltip.vue";
import TooltipTrigger from "../TooltipTrigger.vue";
import TooltipContent from "../TooltipContent.vue";

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
    components: { Tooltip, TooltipTrigger, TooltipContent },
    props: {
      tooltipProps: { type: Object, default: () => ({}) },
    },
    setup(props) {
      return () =>
        h(Tooltip, props.tooltipProps as Record<string, unknown>, () => [
          h(TooltipTrigger, { "data-testid": "trigger" }, () => "Open"),
          h(TooltipContent, { "data-testid": "content" }, () => "Help text"),
        ]);
    },
  });
  return mount(Host, {
    props: { tooltipProps: rootProps },
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

describe("Tooltip — compound API surface", () => {
  it("renders the trigger but not the content when closed", () => {
    const wrapper = mountDefault();
    expect(wrapper.find("[data-testid='trigger']").exists()).toBe(true);
    expect(findContent().exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders the content when defaultOpen={true}", () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const content = findContent();
    expect(content.exists()).toBe(true);
    expect(content.attributes("role")).toBe("tooltip");
    wrapper.unmount();
  });

  it("opens on pointerenter (hover) over the trigger", async () => {
    const wrapper = mountDefault();
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("opens on focus over the trigger", async () => {
    const wrapper = mountDefault();
    await wrapper.find("[data-testid='trigger']").trigger("focus");
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("closes on pointerleave from the trigger (no grace path into content)", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    trigger.element.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: document.body }));
    await wrapper.vm.$nextTick();
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

  it("closes when focus leaves the trigger to outside the surface", async () => {
    // Boundary semantics: the substrate listens via `focusout` for
    // focus leaving the anchor ∪ content surface. `blur` doesn't
    // bubble; `focusout` does. See AnchoredSurfaceController.
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    trigger.element.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(false);
    wrapper.unmount();
  });

  it("wires aria-describedby from trigger to content when open", () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    const content = findContent();
    const id = content.attributes("id");
    expect(id).toBeTruthy();
    expect(trigger.attributes("aria-describedby")).toBe(id);
    wrapper.unmount();
  });

  it("does NOT set aria-describedby when closed", () => {
    const wrapper = mountDefault();
    const trigger = wrapper.find("[data-testid='trigger']");
    expect(trigger.attributes("aria-describedby")).toBeUndefined();
    wrapper.unmount();
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ onOpenChange: spy });
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(spy).toHaveBeenCalledWith(true);
    wrapper.unmount();
  });

  it("respects disabled — pointerenter does not open", async () => {
    const wrapper = mountDefault({ disabled: true });
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(findContent().exists()).toBe(false);
    wrapper.unmount();
  });

  it("disabled root does not fire onOpenChange on hover", async () => {
    const spy = vi.fn();
    const wrapper = mountDefault({ disabled: true, onOpenChange: spy });
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(spy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("controlled open prop overrides internal state", async () => {
    const wrapper = mountDefault({ open: false });
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(findContent().exists()).toBe(false);
    await wrapper.setProps({ tooltipProps: { open: true } });
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("pointerleave INTO content does not close (grace path)", async () => {
    const wrapper = mountDefault({ defaultOpen: true });
    const trigger = wrapper.find("[data-testid='trigger']");
    const content = findContent();
    trigger.element.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: content.element }));
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("closeOnEscape={false} prevents Escape dismissal", async () => {
    const wrapper = mountDefault({ defaultOpen: true, closeOnEscape: false });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("closeOnBlur={false} prevents boundary-focusout dismissal", async () => {
    const wrapper = mountDefault({ defaultOpen: true, closeOnBlur: false });
    wrapper.find("[data-testid='trigger']").element.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await wrapper.vm.$nextTick();
    expect(findContent().exists()).toBe(true);
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

describe("Tooltip — slot-props host adoption", () => {
  function mountAsChild(opts: { onPointerenter?: (e: PointerEvent) => void; consumerRef?: { value: Element | null } } = {}) {
    const Host = defineComponent({
      components: { Tooltip, TooltipTrigger, TooltipContent },
      setup() {
        return () =>
          h(Tooltip, null, () => [
            h(
              TooltipTrigger,
              { asChild: true },
              {
                default: ({ triggerProps }: { triggerProps: Record<string, unknown> }) => {
                  // Consumer-owned ref composed with the substrate's
                  // registration callback from triggerProps.ref. The
                  // slot-props bag is atomic but the *ref* slot is the
                  // one place a consumer may legitimately need to fan
                  // out (their own ref + the substrate's). The standard
                  // Vue pattern is to call both inside one callback.
                  const surfaceRef = triggerProps.ref as (el: unknown) => void;
                  const composedRef = (el: unknown) => {
                    surfaceRef(el);
                    if (opts.consumerRef && (el === null || el instanceof Element)) {
                      opts.consumerRef.value = el;
                    }
                  };
                  return h(
                    "a",
                    {
                      href: "#help",
                      "data-testid": "trigger",
                      onPointerenter: opts.onPointerenter,
                      ...triggerProps,
                      ref: composedRef,
                    },
                    "Help",
                  );
                },
              },
            ),
            h(TooltipContent, { "data-testid": "content" }, () => "Help text"),
          ]);
      },
    });
    return mount(Host, { attachTo: document.body });
  }

  it("renders the adopted child as the actual host (no nested button)", () => {
    const wrapper = mountAsChild();
    const trigger = wrapper.find("[data-testid='trigger']");
    expect(trigger.element.tagName).toBe("A");
    expect(wrapper.find("button").exists()).toBe(false);
    wrapper.unmount();
  });

  it("asChild opens on pointerenter over the adopted child", async () => {
    const wrapper = mountAsChild();
    await wrapper.find("[data-testid='trigger']").trigger("pointerenter");
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("asChild opens on focus over the adopted child", async () => {
    const wrapper = mountAsChild();
    await wrapper.find("[data-testid='trigger']").trigger("focus");
    expect(findContent().exists()).toBe(true);
    wrapper.unmount();
  });

  it("asChild applies data-tooltip-trigger marker on the adopted host", () => {
    const wrapper = mountAsChild();
    expect(wrapper.find("[data-testid='trigger']").attributes("data-tooltip-trigger")).toBeDefined();
    wrapper.unmount();
  });

  it("asChild forwards consumer ref to the adopted DOM node", () => {
    const consumerRef = { value: null as Element | null };
    const wrapper = mountAsChild({ consumerRef });
    expect(consumerRef.value).not.toBeNull();
    expect(consumerRef.value?.tagName).toBe("A");
    wrapper.unmount();
  });
});

describe("Tooltip — accessibility", () => {
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

// @custom:end
