// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Field from "../Field.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Field — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "field" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "field" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("field");
  });

  it("merges custom class", () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "field", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("field");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "field" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="field"]').exists()).toBe(true);
  });

  it("has the correct ARIA role", () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "field" }, slots: { "default": "content" } });
    expect(wrapper.attributes("role")).toBe("group");
  });

  it("applies status=idle variant class", () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder", "status": "idle" }, attrs: { "data-testid": "field" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("field--idle");
  });

  it("applies status=validating variant class", () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder", "status": "validating" }, attrs: { "data-testid": "field" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("field--validating");
  });

  it("applies status=valid variant class", () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder", "status": "valid" }, attrs: { "data-testid": "field" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("field--valid");
  });

  it("applies status=invalid variant class", () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder", "status": "invalid" }, attrs: { "data-testid": "field" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("field--invalid");
  });
});

describe("Field — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Field as Component, { props: { "name": "placeholder" }, attrs: { "data-testid": "field" }, slots: { "default": "content", "label": "<span>Test Field label</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import FieldHeader from "../FieldHeader.vue";


describe("Field — compound parts", () => {
  it("mounts FieldHeader with tag, base class, and slot content", () => {
    const wrapper = mount(FieldHeader as Component, {
      slots: { default: "Field part" },
      attrs: { "data-testid": "field-fieldheader" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("div");
    expect(wrapper.classes()).toContain("field__header");
    expect(wrapper.text()).toContain("Field part");
  });
});
// @custom:end
