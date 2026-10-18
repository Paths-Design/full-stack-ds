// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Details from "../Details.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Details — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true }, attrs: { "data-testid": "details" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true }, attrs: { "data-testid": "details" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("details");
  });

  it("merges custom class", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true }, attrs: { "data-testid": "details", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("details");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true }, attrs: { "data-testid": "details" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="details"]').exists()).toBe(true);
  });

  it("applies variant=default variant class", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true, "variant": "default" }, attrs: { "data-testid": "details" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("details--default");
  });

  it("applies variant=inline variant class", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true, "variant": "inline" }, attrs: { "data-testid": "details" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("details--inline");
  });

  it("applies variant=compact variant class", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true, "variant": "compact" }, attrs: { "data-testid": "details" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("details--compact");
  });

  it("applies icon=left variant class", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true, "icon": "left" }, attrs: { "data-testid": "details" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("details--left");
  });

  it("applies icon=right variant class", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true, "icon": "right" }, attrs: { "data-testid": "details" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("details--right");
  });

  it("applies icon=none variant class", () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true, "icon": "none" }, attrs: { "data-testid": "details" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("details--none");
  });
});

describe("Details — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Details as Component, { props: { "summary": "placeholder", "open": true }, attrs: { "data-testid": "details", "aria-label": "Test Details" }, slots: { "default": "<span>content</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import DetailsContent from "../DetailsContent.vue";


describe("Details — compound parts", () => {
  it("mounts DetailsContent with tag, base class, and slot content", () => {
    const wrapper = mount(DetailsContent as Component, {
      slots: { default: "Details part" },
      attrs: { "data-testid": "details-detailscontent" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("div");
    expect(wrapper.classes()).toContain("details__content");
    expect(wrapper.text()).toContain("Details part");
  });
});
// @custom:end
