// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Accordion from "../Accordion.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Accordion — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Accordion as Component, { props: {}, attrs: { "data-testid": "accordion" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Accordion as Component, { props: {}, attrs: { "data-testid": "accordion" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("accordion");
  });

  it("merges custom class", () => {
    const wrapper = mount(Accordion as Component, { props: {}, attrs: { "data-testid": "accordion", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("accordion");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Accordion as Component, { props: {}, attrs: { "data-testid": "accordion" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="accordion"]').exists()).toBe(true);
  });

  it("applies type=single variant class", () => {
    const wrapper = mount(Accordion as Component, { props: { "type": "single" }, attrs: { "data-testid": "accordion" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("accordion--single");
  });

  it("applies type=multiple variant class", () => {
    const wrapper = mount(Accordion as Component, { props: { "type": "multiple" }, attrs: { "data-testid": "accordion" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("accordion--multiple");
  });
});

describe("Accordion — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Accordion as Component, { props: {}, attrs: { "data-testid": "accordion" }, slots: { "default": "<span>content</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
// CODEGEN-EMIT-LINT-HYGIENE-01: custom suites self-import their own `vi`
// (the Svelte-side convention) — the generated import set is body-derived.
import { vi } from "vitest";
import AccordionContent from "../AccordionContent.vue";
import AccordionItem from "../AccordionItem.vue";
import AccordionTrigger from "../AccordionTrigger.vue";
import { defineComponent, h } from "vue";

// FIX-COMPOUND-CONTAINER-ANCESTOR-PREDICATE-01 (A2, Vue): trigger click toggles
// its own item through the openness channel; aria-expanded + region wire from
// the contract; single mode closes others.
function makeFixture(rootProps: Record<string, unknown>) {
  return defineComponent({
    render() {
      return h(Accordion as Component, rootProps, {
        default: () => [
          h(AccordionItem as Component, {}, {
            default: () => [
              h(AccordionTrigger as Component, { value: "a" }, { default: () => "First" }),
              h(AccordionContent as Component, { value: "a" }, { default: () => "Panel A" }),
            ],
          }),
          h(AccordionItem as Component, {}, {
            default: () => [
              h(AccordionTrigger as Component, { value: "b" }, { default: () => "Second" }),
              h(AccordionContent as Component, { value: "b" }, { default: () => "Panel B" }),
            ],
          }),
        ],
      });
    },
  });
}

describe("Accordion — disclosure behavior", () => {
  it("clicking a trigger expands its own panel and fires the channel callback", async () => {
    const onValueChange = vi.fn();
    const wrapper = mount(makeFixture({ type: "single", onValueChange }));
    const first = wrapper.findAll("button")[0];
    expect(first.attributes("aria-expanded")).toBe("false");
    await first.trigger("click");
    expect(onValueChange).toHaveBeenCalledWith("a");
    expect(wrapper.findAll("button")[0].attributes("aria-expanded")).toBe("true");
    const region = wrapper.find('[role="region"]');
    expect(region.exists()).toBe(true);
    expect(region.attributes("aria-labelledby")).toBe(first.attributes("id"));
  });

  it("single mode: opening a second item closes the first", async () => {
    const wrapper = mount(makeFixture({ type: "single", defaultValue: "a" }));
    const buttons = wrapper.findAll("button");
    expect(buttons[0].attributes("aria-expanded")).toBe("true");
    await buttons[1].trigger("click");
    const after = wrapper.findAll("button");
    expect(after[1].attributes("aria-expanded")).toBe("true");
    expect(after[0].attributes("aria-expanded")).toBe("false");
  });

  it("multiple mode: both items can be open at once", async () => {
    const wrapper = mount(makeFixture({ type: "multiple", defaultValue: ["a"] }));
    await wrapper.findAll("button")[1].trigger("click");
    const after = wrapper.findAll("button");
    expect(after[0].attributes("aria-expanded")).toBe("true");
    expect(after[1].attributes("aria-expanded")).toBe("true");
  });

  it("emits disclosure ARIA, not tab ARIA", () => {
    const wrapper = mount(makeFixture({ type: "single" }));
    expect(wrapper.find('[role="tab"]').exists()).toBe(false);
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('[aria-selected]').exists()).toBe(false);
  });
});


describe("Accordion — compound parts", () => {
  it("mounts AccordionItem with tag, base class, and slot content", () => {
    const wrapper = mount(AccordionItem as Component, {
      slots: { default: "Accordion part" },
      attrs: { "data-testid": "accordion-accordionitem" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("div");
    expect(wrapper.classes()).toContain("accordion__item");
    expect(wrapper.text()).toContain("Accordion part");
  });
});
// @custom:end
