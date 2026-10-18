// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Truncate from "../Truncate.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Truncate — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Truncate as Component, { props: {}, attrs: { "data-testid": "truncate" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Truncate as Component, { props: {}, attrs: { "data-testid": "truncate" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("truncate");
  });

  it("merges custom class", () => {
    const wrapper = mount(Truncate as Component, { props: {}, attrs: { "data-testid": "truncate", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("truncate");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Truncate as Component, { props: {}, attrs: { "data-testid": "truncate" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="truncate"]').exists()).toBe(true);
  });
});

describe("Truncate — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Truncate as Component, { props: {}, attrs: { "data-testid": "truncate" }, slots: { "default": "<span>content</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import TruncateContent from "../TruncateContent.vue";


describe("Truncate — compound parts", () => {
  it("mounts TruncateContent with tag, base class, and slot content", () => {
    const wrapper = mount(TruncateContent as Component, {
      slots: { default: "Truncate part" },
      attrs: { "data-testid": "truncate-truncatecontent" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("div");
    expect(wrapper.classes()).toContain("truncate__content");
    expect(wrapper.text()).toContain("Truncate part");
  });
});
// @custom:end
