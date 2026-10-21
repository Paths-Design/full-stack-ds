// @generated:start imports
import { describe, expect, it } from "vitest";
import type { Component } from "svelte";
import { render } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import Calendar from "../Calendar.svelte";
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
    const { container } = render(Calendar as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const { container } = render(Calendar as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild?.className).toContain("calendar");
  });

  it("merges custom class", () => {
    const { container } = render(Calendar as unknown as Component<Record<string, unknown>>, { props: { "class": "custom" } });
    expect(container.firstElementChild?.className).toContain("calendar");
    expect(container.firstElementChild?.className).toContain("custom");
  });

  it("has the correct ARIA role", () => {
    const { container } = render(Calendar as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild?.getAttribute("role")).toBe("group");
  });

  it("applies mode=single variant class", () => {
    const { container } = render(Calendar as unknown as Component<Record<string, unknown>>, { props: { "mode": "single" } });
    expect(container.firstElementChild?.className).toContain("calendar--single");
  });

  it("applies mode=range variant class", () => {
    const { container } = render(Calendar as unknown as Component<Record<string, unknown>>, { props: { "mode": "range" } });
    expect(container.firstElementChild?.className).toContain("calendar--range");
  });
});

describe("Calendar — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { container } = render(Calendar as unknown as Component<Record<string, unknown>>, { props: { "aria-label": "Test Calendar" } });
    const results = await axe(container, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import CalendarHeader from "../CalendarHeader.svelte";

describe("Calendar — compound parts", () => {
  it("mounts CalendarHeader with tag and base class", () => {
    const { container } = render(CalendarHeader as Component, {
      props: { "data-testid": "calendar-calendarheader" },
    });
    const root = container.querySelector('[data-testid="calendar-calendarheader"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("div");
    expect(root!.className.split(/\s+/)).toContain("calendar__header");
  });
});


// @custom:end
