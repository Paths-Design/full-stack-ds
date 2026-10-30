// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Shuttle from "../Shuttle.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Shuttle — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Shuttle as Component, { props: {}, attrs: { "data-testid": "shuttle" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Shuttle as Component, { props: {}, attrs: { "data-testid": "shuttle" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("shuttle");
  });

  it("merges custom class", () => {
    const wrapper = mount(Shuttle as Component, { props: {}, attrs: { "data-testid": "shuttle", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("shuttle");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Shuttle as Component, { props: {}, attrs: { "data-testid": "shuttle" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="shuttle"]').exists()).toBe(true);
  });

  it("has the correct ARIA role", () => {
    const wrapper = mount(Shuttle as Component, { props: {}, attrs: { "data-testid": "shuttle" }, slots: { "default": "content" } });
    expect(wrapper.attributes("role")).toBe("group");
  });
});

describe("Shuttle — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Shuttle as Component, { props: { "ariaLabel": "Test Shuttle" }, attrs: { "data-testid": "shuttle" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
