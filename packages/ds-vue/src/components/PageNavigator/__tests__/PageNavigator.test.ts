// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import PageNavigator from "../PageNavigator.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("PageNavigator — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(PageNavigator as Component, { props: {}, attrs: { "data-testid": "page-navigator" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(PageNavigator as Component, { props: {}, attrs: { "data-testid": "page-navigator" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("page-navigator");
  });

  it("merges custom class", () => {
    const wrapper = mount(PageNavigator as Component, { props: {}, attrs: { "data-testid": "page-navigator", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("page-navigator");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(PageNavigator as Component, { props: {}, attrs: { "data-testid": "page-navigator" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="page-navigator"]').exists()).toBe(true);
  });

  it("has the correct ARIA role", () => {
    const wrapper = mount(PageNavigator as Component, { props: {}, attrs: { "data-testid": "page-navigator" }, slots: { "default": "content" } });
    expect(wrapper.attributes("role")).toBe("group");
  });
});

describe("PageNavigator — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(PageNavigator as Component, { props: { "label": "Test PageNavigator" }, attrs: { "data-testid": "page-navigator" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
