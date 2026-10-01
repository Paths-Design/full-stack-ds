// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Pagination from "../Pagination.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Pagination — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Pagination as Component, { props: {}, attrs: { "data-testid": "pagination" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Pagination as Component, { props: {}, attrs: { "data-testid": "pagination" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("pagination");
  });

  it("merges custom class", () => {
    const wrapper = mount(Pagination as Component, { props: {}, attrs: { "data-testid": "pagination", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("pagination");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Pagination as Component, { props: {}, attrs: { "data-testid": "pagination" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(true);
  });

  it("has the correct ARIA role", () => {
    const wrapper = mount(Pagination as Component, { props: {}, attrs: { "data-testid": "pagination" }, slots: { "default": "content" } });
    expect(wrapper.attributes("role")).toBe("group");
  });

  it("applies presentation=indicators variant class", () => {
    const wrapper = mount(Pagination as Component, { props: { "presentation": "indicators" }, attrs: { "data-testid": "pagination" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("pagination--indicators");
  });

  it("applies presentation=pages variant class", () => {
    const wrapper = mount(Pagination as Component, { props: { "presentation": "pages" }, attrs: { "data-testid": "pagination" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("pagination--pages");
  });

  it("applies progress=none variant class", () => {
    const wrapper = mount(Pagination as Component, { props: { "progress": "none" }, attrs: { "data-testid": "pagination" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("pagination--none");
  });

  it("applies progress=elapsed variant class", () => {
    const wrapper = mount(Pagination as Component, { props: { "progress": "elapsed" }, attrs: { "data-testid": "pagination" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("pagination--elapsed");
  });
});

describe("Pagination — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Pagination as Component, { props: { "label": "Test Pagination" }, attrs: { "data-testid": "pagination" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
