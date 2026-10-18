// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import ShowMore from "../ShowMore.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("ShowMore — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(ShowMore as Component, { props: {}, attrs: { "data-testid": "show-more" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(ShowMore as Component, { props: {}, attrs: { "data-testid": "show-more" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("show-more");
  });

  it("merges custom class", () => {
    const wrapper = mount(ShowMore as Component, { props: {}, attrs: { "data-testid": "show-more", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("show-more");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(ShowMore as Component, { props: {}, attrs: { "data-testid": "show-more" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="show-more"]').exists()).toBe(true);
  });
});

describe("ShowMore — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(ShowMore as Component, { props: {}, attrs: { "data-testid": "show-more" }, slots: { "default": "<span>content</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import ShowMoreContent from "../ShowMoreContent.vue";
import ShowMoreTrigger from "../ShowMoreTrigger.vue";


describe("ShowMore — compound parts", () => {
  it("mounts ShowMoreContent with tag, base class, and slot content", () => {
    const wrapper = mount(ShowMoreContent as Component, {
      slots: { default: "ShowMore part" },
      attrs: { "data-testid": "showmore-showmorecontent" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("div");
    expect(wrapper.classes()).toContain("show-more__content");
    expect(wrapper.text()).toContain("ShowMore part");
  });

  it("mounts ShowMoreTrigger with tag, base class, and slot content", () => {
    const wrapper = mount(ShowMoreTrigger as Component, {
      slots: { default: "ShowMore part" },
      attrs: { "data-testid": "showmore-showmoretrigger" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("button");
    expect(wrapper.classes()).toContain("show-more__trigger");
    expect(wrapper.text()).toContain("ShowMore part");
  });
});
// @custom:end
