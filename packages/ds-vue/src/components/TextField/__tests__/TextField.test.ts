// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import TextField from "../TextField.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("TextField — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(TextField as Component, { props: {}, attrs: { "data-testid": "text-field" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(TextField as Component, { props: {}, attrs: { "data-testid": "text-field" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("text-field");
  });

  it("merges custom class", () => {
    const wrapper = mount(TextField as Component, { props: {}, attrs: { "data-testid": "text-field", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("text-field");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(TextField as Component, { props: {}, attrs: { "data-testid": "text-field" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="text-field"]').exists()).toBe(true);
  });
});

describe("TextField — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(TextField as Component, { props: {}, attrs: { "data-testid": "text-field" }, slots: { "default": "content", "label": "<span>Test TextField label</span>", "description": "<span>Test TextField description</span>", "error": "<span>Test TextField error</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import TextFieldDescription from "../TextFieldDescription.vue";


describe("TextField — compound parts", () => {
  it("mounts TextFieldDescription with tag, base class, and slot content", () => {
    const wrapper = mount(TextFieldDescription as Component, {
      slots: { default: "TextField part" },
      attrs: { "data-testid": "textfield-textfielddescription" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("p");
    expect(wrapper.classes()).toContain("text-field__description");
    expect(wrapper.text()).toContain("TextField part");
  });
});
// @custom:end
