// @generated:start imports
import { describe, it, expect, afterEach } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Walkthrough from "../Walkthrough.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Walkthrough — unit", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders with default props", () => {
    const wrapper = mount(Walkthrough as Component, { props: {}, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    mount(Walkthrough as Component, { props: {}, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content" }, attachTo: document.body });
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    expect(root?.classList.contains("walkthrough")).toBe(true);
  });

  it("merges custom class", () => {
    mount(Walkthrough as Component, { props: {}, attrs: { "data-testid": "walkthrough", "class": "custom" }, slots: { "default": "content" }, attachTo: document.body });
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    expect(root?.classList.contains("walkthrough")).toBe(true);
    expect(root?.classList.contains("custom")).toBe(true);
  });

  it("forwards data-testid to the rendered element", () => {
    mount(Walkthrough as Component, { props: {}, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content" }, attachTo: document.body });
    expect(document.body.querySelector('[data-testid="walkthrough"]')).not.toBeNull();
  });

  it("has the correct ARIA role", () => {
    mount(Walkthrough as Component, { props: {}, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content" }, attachTo: document.body });
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    expect(root?.getAttribute("role")).toBe("status");
  });

  it("applies placement=top variant class", () => {
    mount(Walkthrough as Component, { props: { "placement": "top" }, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content" }, attachTo: document.body });
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    expect(root?.classList.contains("walkthrough--top")).toBe(true);
  });

  it("applies placement=bottom variant class", () => {
    mount(Walkthrough as Component, { props: { "placement": "bottom" }, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content" }, attachTo: document.body });
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    expect(root?.classList.contains("walkthrough--bottom")).toBe(true);
  });

  it("applies placement=left variant class", () => {
    mount(Walkthrough as Component, { props: { "placement": "left" }, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content" }, attachTo: document.body });
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    expect(root?.classList.contains("walkthrough--left")).toBe(true);
  });

  it("applies placement=right variant class", () => {
    mount(Walkthrough as Component, { props: { "placement": "right" }, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content" }, attachTo: document.body });
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    expect(root?.classList.contains("walkthrough--right")).toBe(true);
  });

  it("applies placement=auto variant class", () => {
    mount(Walkthrough as Component, { props: { "placement": "auto" }, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content" }, attachTo: document.body });
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    expect(root?.classList.contains("walkthrough--auto")).toBe(true);
  });
});

describe("Walkthrough — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    mount(Walkthrough as Component, { props: {}, attrs: { "data-testid": "walkthrough" }, slots: { "default": "content", "title": "<span>Test Walkthrough title</span>", "description": "<span>Test Walkthrough description</span>" }, attachTo: document.body });
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    const results = await axe(root as Element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import WalkthroughContent from "../WalkthroughContent.vue";
import WalkthroughDescription from "../WalkthroughDescription.vue";
import WalkthroughTitle from "../WalkthroughTitle.vue";


describe("Walkthrough — compound parts", () => {
  it("mounts WalkthroughContent with tag, base class, and slot content", () => {
    const wrapper = mount(WalkthroughContent as Component, {
      slots: { default: "Walkthrough part" },
      attrs: { "data-testid": "walkthrough-walkthroughcontent" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("div");
    expect(wrapper.classes()).toContain("walkthrough__content");
    expect(wrapper.text()).toContain("Walkthrough part");
  });

  it("mounts WalkthroughDescription with tag, base class, and slot content", () => {
    const wrapper = mount(WalkthroughDescription as Component, {
      slots: { default: "Walkthrough part" },
      attrs: { "data-testid": "walkthrough-walkthroughdescription" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("p");
    expect(wrapper.classes()).toContain("walkthrough__description");
    expect(wrapper.text()).toContain("Walkthrough part");
  });

  it("mounts WalkthroughTitle with tag, base class, and slot content", () => {
    const wrapper = mount(WalkthroughTitle as Component, {
      slots: { default: "Walkthrough part" },
      attrs: { "data-testid": "walkthrough-walkthroughtitle" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("h3");
    expect(wrapper.classes()).toContain("walkthrough__title");
    expect(wrapper.text()).toContain("Walkthrough part");
  });
});
// @custom:end
