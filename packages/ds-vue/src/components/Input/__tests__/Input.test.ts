// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Input from "../Input.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Input — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Input as Component, { props: {}, attrs: { "data-testid": "input" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Input as Component, { props: {}, attrs: { "data-testid": "input" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("input");
  });

  it("merges custom class", () => {
    const wrapper = mount(Input as Component, { props: {}, attrs: { "data-testid": "input", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("input");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Input as Component, { props: {}, attrs: { "data-testid": "input" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="input"]').exists()).toBe(true);
  });
});

describe("Input — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Input as Component, { props: { "ariaLabel": "Test Input" }, attrs: { "data-testid": "input" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
