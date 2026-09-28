// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Carousel from "../Carousel.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Carousel — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Carousel as Component, { props: {}, attrs: { "data-testid": "carousel" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Carousel as Component, { props: {}, attrs: { "data-testid": "carousel" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("carousel");
  });

  it("merges custom class", () => {
    const wrapper = mount(Carousel as Component, { props: {}, attrs: { "data-testid": "carousel", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("carousel");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Carousel as Component, { props: {}, attrs: { "data-testid": "carousel" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="carousel"]').exists()).toBe(true);
  });

  it("applies indicator=pagination variant class", () => {
    const wrapper = mount(Carousel as Component, { props: { "indicator": "pagination" }, attrs: { "data-testid": "carousel" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("carousel--pagination");
  });

  it("applies indicator=next variant class", () => {
    const wrapper = mount(Carousel as Component, { props: { "indicator": "next" }, attrs: { "data-testid": "carousel" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("carousel--next");
  });

  it("applies indicator=both variant class", () => {
    const wrapper = mount(Carousel as Component, { props: { "indicator": "both" }, attrs: { "data-testid": "carousel" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("carousel--both");
  });
});

describe("Carousel — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Carousel as Component, { props: { "label": "Test Carousel" }, attrs: { "data-testid": "carousel" }, slots: { "default": "<span>content</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
