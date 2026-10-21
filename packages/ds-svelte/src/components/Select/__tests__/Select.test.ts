// @generated:start imports
import { describe, expect, it, vi } from "vitest";
import type { Component } from "svelte";
import { render } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import Select from "../Select.svelte";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Select — unit", () => {
  it("renders with default props", () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true } });
    expect(container.firstElementChild).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true } });
    expect(container.firstElementChild?.className).toContain("select");
  });

  it("merges custom class", () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true, "class": "custom" } });
    expect(container.firstElementChild?.className).toContain("select");
    expect(container.firstElementChild?.className).toContain("custom");
  });

  it("applies size=sm variant class", () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true, "size": "sm" } });
    expect(container.firstElementChild?.className).toContain("select--sm");
  });

  it("applies size=md variant class", () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true, "size": "md" } });
    expect(container.firstElementChild?.className).toContain("select--md");
  });

  it("applies size=lg variant class", () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true, "size": "lg" } });
    expect(container.firstElementChild?.className).toContain("select--lg");
  });

  it("applies position=bottom variant class", () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true, "position": "bottom" } });
    expect(container.firstElementChild?.className).toContain("select--bottom");
  });

  it("applies position=top variant class", () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true, "position": "top" } });
    expect(container.firstElementChild?.className).toContain("select--top");
  });

  it("applies position=auto variant class", () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true, "position": "auto" } });
    expect(container.firstElementChild?.className).toContain("select--auto");
  });

  it("closes on Escape key", async () => {
    const onOpenChangeSpy = vi.fn();
    render(Select as unknown as Component<Record<string, unknown>>, { props: { "open": true, "onOpenChange": onOpenChangeSpy } });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

describe("Select — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { container } = render(Select as unknown as Component<Record<string, unknown>>, { props: { "triggerLabel": "Test Select", "open": true } });
    const results = await axe(container, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import SelectContent from "../SelectContent.svelte";
import SelectOption from "../SelectOption.svelte";
import SelectTrigger from "../SelectTrigger.svelte";
import { cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { beforeEach } from "vitest";

describe("Select — compound parts", () => {
  it("mounts SelectContent with tag and base class", () => {
    const { container } = render(SelectContent as Component, {
      props: { "data-testid": "select-selectcontent" },
    });
    const root = container.querySelector('[data-testid="select-selectcontent"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("div");
    expect(root!.className.split(/\s+/)).toContain("select__content");
  });

  it("mounts SelectOption with tag and base class", () => {
    const { container } = render(SelectOption as Component, {
      props: { "data-testid": "select-selectoption" },
    });
    const root = container.querySelector('[data-testid="select-selectoption"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("li");
    expect(root!.className.split(/\s+/)).toContain("select__option");
  });

  it("mounts SelectTrigger with tag and base class", () => {
    const { container } = render(SelectTrigger as Component, {
      props: { "data-testid": "select-selecttrigger" },
    });
    const root = container.querySelector('[data-testid="select-selecttrigger"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("button");
    expect(root!.className.split(/\s+/)).toContain("select__trigger");
  });
});

describe("Select — keyboard realization (FEAT-A11Y-COMPOSITE-KEYBOARD-01)", () => {
  // This package runs without vitest globals, so @testing-library/svelte's
  // automatic afterEach cleanup never registers; these role queries would
  // otherwise match leaked mounts from every earlier test.
  beforeEach(cleanup);

  const renderOpen = (props: Record<string, unknown> = {}) =>
    render(Select as unknown as Component<Record<string, unknown>>, {
      props: { "defaultOpen": true, ...props },
    });

  it("ArrowDown on the closed trigger opens the panel and moves focus into the listbox", async () => {
    const { getByRole } = renderOpen({ defaultOpen: false });
    const trigger = getByRole("combobox", { name: "Select an option" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const listbox = await waitFor(() => {
      const listbox = getByRole("listbox");
      expect(listbox).toBeTruthy();
      return listbox;
    });
    // Non-searchable Select: the search-input initial focus falls back to
    // the first option — focus must land inside the panel either way.
    await waitFor(() => expect(listbox.contains(document.activeElement)).toBe(true));
  });

  it("roving hosts are programmatically focusable but out of tab order", () => {
    const { getByRole, getAllByRole } = renderOpen();
    expect(getByRole("listbox").getAttribute("tabindex")).toBe("-1");
    for (const option of getAllByRole("option")) {
      expect(option.getAttribute("tabindex")).toBe("-1");
    }
  });

  it("ArrowDown/ArrowUp on the listbox rove DOM focus through the options", async () => {
    const { getByRole, getAllByRole } = renderOpen();
    const options = getAllByRole("option");
    const listbox = getByRole("listbox");
    options[0]!.focus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    await waitFor(() => expect(document.activeElement).toBe(options[1]));
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    await waitFor(() => expect(document.activeElement).toBe(options[2]));
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    await waitFor(() => expect(document.activeElement).toBe(options[1]));
  });

  it("ArrowUp from the first option wraps to the last; Home/End jump to the extremes", async () => {
    const { getByRole, getAllByRole } = renderOpen();
    const options = getAllByRole("option");
    const listbox = getByRole("listbox");
    options[0]!.focus();
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    await waitFor(() => expect(document.activeElement).toBe(options[2]));
    fireEvent.keyDown(listbox, { key: "Home" });
    await waitFor(() => expect(document.activeElement).toBe(options[0]));
    fireEvent.keyDown(listbox, { key: "End" });
    await waitFor(() => expect(document.activeElement).toBe(options[2]));
  });

  it("Enter on an option commits that option's value", () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    const { getAllByRole } = renderOpen({ value: "alpha", onChange, onOpenChange });
    fireEvent.keyDown(getAllByRole("option")[1]!, { key: "Enter" }); // Beta
    expect(onChange).toHaveBeenCalledWith("beta");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Enter adds an absent option's value in multiple mode (controlled)", () => {
    const onChange = vi.fn();
    const { getAllByRole } = renderOpen({ multiple: true, value: ["alpha"], onChange });
    fireEvent.keyDown(getAllByRole("option")[2]!, { key: "Enter" }); // Gamma absent → add
    expect(onChange).toHaveBeenCalledWith(["alpha", "gamma"]);
  });

  it("Enter removes a present option's value in multiple mode (controlled)", () => {
    const onChange = vi.fn();
    const { getAllByRole } = renderOpen({ multiple: true, value: ["alpha", "gamma"], onChange });
    fireEvent.keyDown(getAllByRole("option")[0]!, { key: "Enter" }); // Alpha present → remove
    expect(onChange).toHaveBeenCalledWith(["gamma"]);
  });
});

// @custom:end
