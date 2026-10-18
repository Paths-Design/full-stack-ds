// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Checkbox from "../Checkbox.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Checkbox — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Checkbox as Component, { props: {}, attrs: { "data-testid": "checkbox" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Checkbox as Component, { props: {}, attrs: { "data-testid": "checkbox" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("checkbox");
  });

  it("merges custom class", () => {
    const wrapper = mount(Checkbox as Component, { props: {}, attrs: { "data-testid": "checkbox", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("checkbox");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Checkbox as Component, { props: {}, attrs: { "data-testid": "checkbox" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="checkbox"]').exists()).toBe(true);
  });

  it("applies size=sm variant class", () => {
    const wrapper = mount(Checkbox as Component, { props: { "size": "sm" }, attrs: { "data-testid": "checkbox" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("checkbox--sm");
  });

  it("applies size=md variant class", () => {
    const wrapper = mount(Checkbox as Component, { props: { "size": "md" }, attrs: { "data-testid": "checkbox" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("checkbox--md");
  });

  it("applies size=lg variant class", () => {
    const wrapper = mount(Checkbox as Component, { props: { "size": "lg" }, attrs: { "data-testid": "checkbox" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("checkbox--lg");
  });

  it("sets .indeterminate as a DOM property (not an attribute) and lowers aria-checked to mixed", () => {
    const wrapper = mount(Checkbox as Component, { props: { "indeterminate": true }, attrs: { "data-testid": "checkbox" }, slots: { "default": "content" } });
    const el = wrapper.element.querySelector(".checkbox__input") as HTMLInputElement;
    expect(el.indeterminate).toBe(true);
    expect(el.getAttribute("aria-checked")).toBe("mixed");
  });

  it("re-applies .indeterminate when the prop changes from true to false, and aria-checked reflects checked state again", async () => {
    const wrapper = mount(Checkbox as Component, { props: { "indeterminate": true }, attrs: { "data-testid": "checkbox" }, slots: { "default": "content" } });
    const el = wrapper.element.querySelector(".checkbox__input") as HTMLInputElement;
    expect(el.indeterminate).toBe(true);
    await wrapper.setProps({ indeterminate: false });
    expect(el.indeterminate).toBe(false);
    expect(el.getAttribute("aria-checked")).toBe("false");
  });
});

describe("Checkbox — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Checkbox as Component, { props: { "ariaLabel": "Test Checkbox" }, attrs: { "data-testid": "checkbox" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
