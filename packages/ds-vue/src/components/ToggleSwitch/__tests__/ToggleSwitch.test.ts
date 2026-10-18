// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import ToggleSwitch from "../ToggleSwitch.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("ToggleSwitch — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(ToggleSwitch as Component, { props: {}, attrs: { "data-testid": "toggle-switch" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(ToggleSwitch as Component, { props: {}, attrs: { "data-testid": "toggle-switch" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("toggle-switch");
  });

  it("merges custom class", () => {
    const wrapper = mount(ToggleSwitch as Component, { props: {}, attrs: { "data-testid": "toggle-switch", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("toggle-switch");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(ToggleSwitch as Component, { props: {}, attrs: { "data-testid": "toggle-switch" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="toggle-switch"]').exists()).toBe(true);
  });

  it("applies size=small variant class", () => {
    const wrapper = mount(ToggleSwitch as Component, { props: { "size": "small" }, attrs: { "data-testid": "toggle-switch" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("toggle-switch--small");
  });

  it("applies size=medium variant class", () => {
    const wrapper = mount(ToggleSwitch as Component, { props: { "size": "medium" }, attrs: { "data-testid": "toggle-switch" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("toggle-switch--medium");
  });

  it("applies size=large variant class", () => {
    const wrapper = mount(ToggleSwitch as Component, { props: { "size": "large" }, attrs: { "data-testid": "toggle-switch" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("toggle-switch--large");
  });
});

describe("ToggleSwitch — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(ToggleSwitch as Component, { props: { "ariaLabel": "Test ToggleSwitch" }, attrs: { "data-testid": "toggle-switch" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
