// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Blockquote from "../Blockquote.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Blockquote — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Blockquote as Component, { props: {}, attrs: { "data-testid": "blockquote" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Blockquote as Component, { props: {}, attrs: { "data-testid": "blockquote" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("blockquote");
  });

  it("merges custom class", () => {
    const wrapper = mount(Blockquote as Component, { props: {}, attrs: { "data-testid": "blockquote", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("blockquote");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Blockquote as Component, { props: {}, attrs: { "data-testid": "blockquote" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="blockquote"]').exists()).toBe(true);
  });

  it("applies variant=default variant class", () => {
    const wrapper = mount(Blockquote as Component, { props: { "variant": "default" }, attrs: { "data-testid": "blockquote" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("blockquote--default");
  });

  it("applies variant=bordered variant class", () => {
    const wrapper = mount(Blockquote as Component, { props: { "variant": "bordered" }, attrs: { "data-testid": "blockquote" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("blockquote--bordered");
  });

  it("applies variant=highlighted variant class", () => {
    const wrapper = mount(Blockquote as Component, { props: { "variant": "highlighted" }, attrs: { "data-testid": "blockquote" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("blockquote--highlighted");
  });

  it("applies size=sm variant class", () => {
    const wrapper = mount(Blockquote as Component, { props: { "size": "sm" }, attrs: { "data-testid": "blockquote" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("blockquote--sm");
  });

  it("applies size=md variant class", () => {
    const wrapper = mount(Blockquote as Component, { props: { "size": "md" }, attrs: { "data-testid": "blockquote" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("blockquote--md");
  });

  it("applies size=lg variant class", () => {
    const wrapper = mount(Blockquote as Component, { props: { "size": "lg" }, attrs: { "data-testid": "blockquote" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("blockquote--lg");
  });
});

describe("Blockquote — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Blockquote as Component, { props: {}, attrs: { "data-testid": "blockquote" }, slots: { "default": "<span>content</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
it("updates and omits source URL metadata without replacing quoted content", async () => {
  const quote = "التصميم — 日本語 — “quoted”";
  const wrapper = mount(Blockquote as Component, { props: { cite: undefined }, slots: { default: `<span lang="ar" dir="rtl">${quote}</span>` } });
  const element = wrapper.find("blockquote").element;
  for (const cite of [undefined, "https://example.test/مصدر?edition=2&lang=ar", "/sources/日本語#quote", "", undefined]) {
    await wrapper.setProps({ cite });
    expect(wrapper.find("blockquote").element).toBe(element);
    expect(element.getAttribute("cite")).toBe(cite ?? null);
    expect(element.textContent).toBe(quote);
    expect(element.querySelector("a, button, [tabindex]")).toBeNull();
  }
  wrapper.unmount();
});
// @custom:end
