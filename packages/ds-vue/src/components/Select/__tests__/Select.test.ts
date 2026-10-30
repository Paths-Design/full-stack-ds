// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Select from "../Select.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Select — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Select as Component, { props: { "open": true }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Select as Component, { props: { "open": true }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("select");
  });

  it("merges custom class", () => {
    const wrapper = mount(Select as Component, { props: { "open": true }, attrs: { "data-testid": "select", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("select");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Select as Component, { props: { "open": true }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="select"]').exists()).toBe(true);
  });

  it("applies size=sm variant class", () => {
    const wrapper = mount(Select as Component, { props: { "open": true, "size": "sm" }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("select--sm");
  });

  it("applies size=md variant class", () => {
    const wrapper = mount(Select as Component, { props: { "open": true, "size": "md" }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("select--md");
  });

  it("applies size=lg variant class", () => {
    const wrapper = mount(Select as Component, { props: { "open": true, "size": "lg" }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("select--lg");
  });

  it("applies position=bottom variant class", () => {
    const wrapper = mount(Select as Component, { props: { "open": true, "position": "bottom" }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("select--bottom");
  });

  it("applies position=top variant class", () => {
    const wrapper = mount(Select as Component, { props: { "open": true, "position": "top" }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("select--top");
  });

  it("applies position=auto variant class", () => {
    const wrapper = mount(Select as Component, { props: { "open": true, "position": "auto" }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("select--auto");
  });

  it("closes on Escape key", async () => {
    const onOpenChangeSpy = vi.fn();
    mount(Select as Component, { props: { "open": true, "onOpenChange": onOpenChangeSpy }, attrs: { "data-testid": "select" }, slots: { "default": "content" }, attachTo: document.body });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

describe("Select — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Select as Component, { props: { "open": true, "triggerLabel": "Test Select" }, attrs: { "data-testid": "select" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import SelectContent from "../SelectContent.vue";
import SelectOption from "../SelectOption.vue";
import SelectTrigger from "../SelectTrigger.vue";
import { afterEach } from "vitest";

// VUE-FIRST-RENDER-CONTROLLABLE-DEFAULT-01.
// The generated tests above all pass `open: true` (controlled), which
// bypasses the controllable-state default path. The bug surfaced in
// BINDING-EXPRESSION-V2-PREDICATE-01 runtime rail only fires on the
// *uncontrolled* path: passing `defaultOpen: true` should make the
// listbox render on first mount. These tests pin the contract.
describe("Select — uncontrolled defaultOpen first-render", () => {
  it("renders the listbox content on first mount with defaultOpen=true", () => {
    const wrapper = mount(Select as Component, {
      props: { defaultOpen: true },
    });
    // The `v-if="behavior.open.value"` guard must be open on first
    // render. The listbox content carries class `select__content`.
    expect(wrapper.find(".select__content").exists()).toBe(true);
  });

  it("reports aria-expanded='true' on first mount with defaultOpen=true", () => {
    const wrapper = mount(Select as Component, {
      props: { defaultOpen: true },
    });
    // The combobox is the trigger: its aria-expanded reads `behavior.open.value`,
    // and the wrapper carries no combobox state of its own.
    expect(wrapper.find(".select__trigger").attributes("aria-expanded")).toBe("true");
    expect(wrapper.attributes("aria-expanded")).toBeUndefined();
  });

  it("renders three default options on first mount with defaultOpen=true", () => {
    const wrapper = mount(Select as Component, {
      props: { defaultOpen: true },
    });
    const options = wrapper.findAll(".select__option");
    expect(options).toHaveLength(3);
  });

  it("marks the option matching defaultValue as aria-selected='true'", () => {
    const wrapper = mount(Select as Component, {
      props: { defaultOpen: true, defaultValue: "beta" },
    });
    const options = wrapper.findAll(".select__option");
    const selected = options.map((o) => o.attributes("aria-selected"));
    // memberOf(item.value, "beta") collapses to scalar equality at
    // runtime because the channel value is a string, not an array.
    expect(selected).toEqual(["false", "true", "false"]);
  });
});

// FEAT-BINDING-CALL-WITH-ARG-01: the option-click wire
// `channel:selection.onChange(iter:item.value)` lowers in Vue to
// `@click="() => behavior.setSelection(item.value)"` — clicking option N must
// call onChange with that option's value (proving the setter runs with the
// per-item payload, not the pre-fix self-write).
describe("Select — option selection (FEAT-BINDING-CALL-WITH-ARG-01)", () => {
  it("clicking option N calls onChange with that option's value", async () => {
    const onChange = vi.fn();
    const wrapper = mount(Select as Component, {
      props: { defaultOpen: true, onChange },
    });
    const options = wrapper.findAll(".select__option");
    expect(options).toHaveLength(3);

    await options[2].trigger("click"); // Gamma
    expect(onChange).toHaveBeenCalledWith("gamma");

    await options[0].trigger("click"); // Alpha
    expect(onChange).toHaveBeenLastCalledWith("alpha");
  });

  it("passes the clicked item value, not the standing selection (falsification)", async () => {
    const onChange = vi.fn();
    const wrapper = mount(Select as Component, {
      // Controlled selection standing at "beta".
      props: { open: true, value: "beta", onChange },
    });
    await wrapper.findAll(".select__option")[0].trigger("click"); // Alpha
    expect(onChange).toHaveBeenCalledWith("alpha");
    expect(onChange).not.toHaveBeenCalledWith("beta");
  });
});

// FEAT-CHANNEL-UPDATE-OPERATIONS-01: multiple-mode toggle on the option-click
// wire. Pins the A3 behavioral claim for Vue (alongside React).
describe("Select — multiple-mode toggle (channelUpdate toggleMembership)", () => {
  it("in multiple mode, clicking an absent option adds it to the array", async () => {
    const onChange = vi.fn();
    const wrapper = mount(Select as Component, {
      props: { open: true, multiple: true, value: ["alpha"], onChange },
    });
    await wrapper.findAll(".select__option")[2].trigger("click"); // Gamma
    expect(onChange).toHaveBeenLastCalledWith(["alpha", "gamma"]);
  });

  it("in multiple mode, clicking a present option removes it from the array", async () => {
    const onChange = vi.fn();
    const wrapper = mount(Select as Component, {
      props: { open: true, multiple: true, value: ["alpha", "beta"], onChange },
    });
    await wrapper.findAll(".select__option")[0].trigger("click"); // Alpha (present)
    expect(onChange).toHaveBeenLastCalledWith(["beta"]);
  });

  it("single mode is unchanged: clicking replaces with the scalar value", async () => {
    const onChange = vi.fn();
    const wrapper = mount(Select as Component, {
      props: { open: true, value: "alpha", onChange },
    });
    await wrapper.findAll(".select__option")[1].trigger("click"); // Beta
    expect(onChange).toHaveBeenLastCalledWith("beta");
  });
});


describe("Select — compound parts", () => {
  it("mounts SelectContent with tag, base class, and slot content", () => {
    const wrapper = mount(SelectContent as Component, {
      slots: { default: "Select part" },
      attrs: { "data-testid": "select-selectcontent" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("div");
    expect(wrapper.classes()).toContain("select__content");
    expect(wrapper.text()).toContain("Select part");
  });

  it("mounts SelectOption with tag, base class, and slot content", () => {
    const wrapper = mount(SelectOption as Component, {
      slots: { default: "Select part" },
      attrs: { "data-testid": "select-selectoption" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("li");
    expect(wrapper.classes()).toContain("select__option");
    expect(wrapper.text()).toContain("Select part");
  });

  it("mounts SelectTrigger with tag, base class, and slot content", () => {
    const wrapper = mount(SelectTrigger as Component, {
      slots: { default: "Select part" },
      attrs: { "data-testid": "select-selecttrigger" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("button");
    expect(wrapper.classes()).toContain("select__trigger");
    expect(wrapper.text()).toContain("Select part");
  });
});

describe("Select — keyboard realization (FEAT-A11Y-COMPOSITE-KEYBOARD-01)", () => {
  // The roving handlers move real DOM focus, which jsdom only honors inside
  // the attached document tree — VTU's default mount leaves the wrapper
  // detached, so every mount here attaches and unmounts explicitly.
  let mounted: ReturnType<typeof mount> | null = null;
  afterEach(() => {
    mounted?.unmount();
    mounted = null;
  });
  const mountOpen = (props: Record<string, unknown> = {}) => {
    mounted = mount(Select as Component, {
      attachTo: document.body,
      props: { defaultOpen: true, ...props },
    });
    return mounted;
  };

  it("ArrowDown on the closed trigger opens the panel and moves focus into the listbox", async () => {
    mounted = mount(Select as Component, {
      attachTo: document.body,
      props: { defaultOpen: false },
    });
    const wrapper = mounted;
    await wrapper.find("button").trigger("keydown", { key: "ArrowDown" });
    await vi.waitFor(() => {
      const listbox = wrapper.find('[role="listbox"]');
      expect(listbox.exists()).toBe(true);
      // Non-searchable Select: the search-input initial focus falls back to
      // the first option — focus must land inside the panel either way.
      expect(listbox.element.contains(document.activeElement)).toBe(true);
    });
  });

  it("roving hosts are programmatically focusable but out of tab order", () => {
    const wrapper = mountOpen();
    expect(wrapper.find('[role="listbox"]').attributes("tabindex")).toBe("-1");
    for (const option of wrapper.findAll('[role="option"]')) {
      expect(option.attributes("tabindex")).toBe("-1");
    }
  });

  it("ArrowDown/ArrowUp on the listbox rove DOM focus through the options", async () => {
    const wrapper = mountOpen();
    const options = wrapper.findAll('[role="option"]');
    (options[0]!.element as HTMLElement).focus();
    await wrapper.find('[role="listbox"]').trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]!.element);
    await wrapper.find('[role="listbox"]').trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[2]!.element);
    await wrapper.find('[role="listbox"]').trigger("keydown", { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[1]!.element);
  });

  it("ArrowUp from the first option wraps to the last; Home/End jump to the extremes", async () => {
    const wrapper = mountOpen();
    const options = wrapper.findAll('[role="option"]');
    (options[0]!.element as HTMLElement).focus();
    await wrapper.find('[role="listbox"]').trigger("keydown", { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[2]!.element);
    await wrapper.find('[role="listbox"]').trigger("keydown", { key: "Home" });
    expect(document.activeElement).toBe(options[0]!.element);
    await wrapper.find('[role="listbox"]').trigger("keydown", { key: "End" });
    expect(document.activeElement).toBe(options[2]!.element);
  });

  it("Enter on an option commits that option's value", async () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    const wrapper = mountOpen({ value: "alpha", onChange, onOpenChange });
    await wrapper.findAll('[role="option"]')[1]!.trigger("keydown", { key: "Enter" }); // Beta
    expect(onChange).toHaveBeenCalledWith("beta");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Enter adds an absent option's value in multiple mode (controlled)", async () => {
    const onChange = vi.fn();
    const wrapper = mountOpen({ multiple: true, value: ["alpha"], onChange });
    await wrapper.findAll('[role="option"]')[2]!.trigger("keydown", { key: "Enter" }); // Gamma absent → add
    expect(onChange).toHaveBeenCalledWith(["alpha", "gamma"]);
  });

  it("Enter removes a present option's value in multiple mode (controlled)", async () => {
    const onChange = vi.fn();
    const wrapper = mountOpen({ multiple: true, value: ["alpha", "gamma"], onChange });
    await wrapper.findAll('[role="option"]')[0]!.trigger("keydown", { key: "Enter" }); // Alpha present → remove
    expect(onChange).toHaveBeenCalledWith(["gamma"]);
  });
});

// @custom:end
