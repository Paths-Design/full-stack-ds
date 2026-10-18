// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import RadioGroup from "../RadioGroup.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("RadioGroup — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(RadioGroup as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "radio-group" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(RadioGroup as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "radio-group" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("radio-group");
  });

  it("merges custom class", () => {
    const wrapper = mount(RadioGroup as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "radio-group", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("radio-group");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(RadioGroup as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "radio-group" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="radio-group"]').exists()).toBe(true);
  });

  it("has the correct ARIA role", () => {
    const wrapper = mount(RadioGroup as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "radio-group" }, slots: { "default": "content" } });
    expect(wrapper.attributes("role")).toBe("radiogroup");
  });

  it("applies orientation=vertical variant class", () => {
    const wrapper = mount(RadioGroup as Component, { props: { "name": "placeholder", "orientation": "vertical" }, attrs: { "data-testid": "radio-group" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("radio-group--vertical");
  });

  it("applies orientation=horizontal variant class", () => {
    const wrapper = mount(RadioGroup as Component, { props: { "name": "placeholder", "orientation": "horizontal" }, attrs: { "data-testid": "radio-group" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("radio-group--horizontal");
  });
});

describe("RadioGroup — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(RadioGroup as Component, { props: { "name": "placeholder", "ariaLabel": "Test RadioGroup" }, attrs: { "data-testid": "radio-group" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
