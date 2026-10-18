// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Switch from "../Switch.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Switch — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Switch as Component, { props: {}, attrs: { "data-testid": "switch" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Switch as Component, { props: {}, attrs: { "data-testid": "switch" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("switch");
  });

  it("merges custom class", () => {
    const wrapper = mount(Switch as Component, { props: {}, attrs: { "data-testid": "switch", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("switch");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Switch as Component, { props: {}, attrs: { "data-testid": "switch" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="switch"]').exists()).toBe(true);
  });

  it("applies size=sm variant class", () => {
    const wrapper = mount(Switch as Component, { props: { "size": "sm" }, attrs: { "data-testid": "switch" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("switch--sm");
  });

  it("applies size=md variant class", () => {
    const wrapper = mount(Switch as Component, { props: { "size": "md" }, attrs: { "data-testid": "switch" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("switch--md");
  });

  it("applies size=lg variant class", () => {
    const wrapper = mount(Switch as Component, { props: { "size": "lg" }, attrs: { "data-testid": "switch" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("switch--lg");
  });
});

describe("Switch — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Switch as Component, { props: {}, attrs: { "data-testid": "switch", "aria-label": "Test Switch" }, slots: { "default": "<span>content</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
