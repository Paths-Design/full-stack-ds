// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Calendar from "../Calendar.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Calendar — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Calendar as Component, { props: {}, attrs: { "data-testid": "calendar" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Calendar as Component, { props: {}, attrs: { "data-testid": "calendar" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("calendar");
  });

  it("merges custom class", () => {
    const wrapper = mount(Calendar as Component, { props: {}, attrs: { "data-testid": "calendar", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("calendar");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Calendar as Component, { props: {}, attrs: { "data-testid": "calendar" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="calendar"]').exists()).toBe(true);
  });

  it("has the correct ARIA role", () => {
    const wrapper = mount(Calendar as Component, { props: {}, attrs: { "data-testid": "calendar" }, slots: { "default": "content" } });
    expect(wrapper.attributes("role")).toBe("group");
  });

  it("applies mode=single variant class", () => {
    const wrapper = mount(Calendar as Component, { props: { "mode": "single" }, attrs: { "data-testid": "calendar" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("calendar--single");
  });

  it("applies mode=range variant class", () => {
    const wrapper = mount(Calendar as Component, { props: { "mode": "range" }, attrs: { "data-testid": "calendar" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("calendar--range");
  });
});

describe("Calendar — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Calendar as Component, { props: {}, attrs: { "data-testid": "calendar", "aria-label": "Test Calendar" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import CalendarHeader from "../CalendarHeader.vue";


describe("Calendar — compound parts", () => {
  it("mounts CalendarHeader with tag, base class, and slot content", () => {
    const wrapper = mount(CalendarHeader as Component, {
      slots: { default: "Calendar part" },
      attrs: { "data-testid": "calendar-calendarheader" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("div");
    expect(wrapper.classes()).toContain("calendar__header");
    expect(wrapper.text()).toContain("Calendar part");
  });
});
// @custom:end
