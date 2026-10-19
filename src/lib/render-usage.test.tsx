import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { bundle } from "../types/bundle";
import { UsageExamples } from "../views/sections/UsageExamples";
import {
  findRequiredRegionViolations,
  deriveRequiredRegionObligations,
} from "../../packages/ds-codegen/src/usage-composition";

afterEach(cleanup);

function component(name: string) {
  const match = bundle.components.find((entry) => entry.name === name);
  if (!match) throw new Error(`missing component bundle: ${name}`);
  return match;
}

describe("usage sidecar render projection", () => {
  it("routes contract-declared named regions through the generated slots prop", () => {
    render(<UsageExamples component={component("Field")} />);

    expect(screen.getAllByText("Email address").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy();
    expect(
      screen.getByText("We will only use this to send account notifications."),
    ).toBeTruthy();
  });

  it("preserves ordinary children when an authored region is also present", () => {
    render(<UsageExamples component={component("Chip")} />);

    expect(screen.getByText("TypeScript")).toBeTruthy();
  });

  it("renders explicit Status labels from the Status sidecar", () => {
    const { container } = render(<UsageExamples component={component("Status")} />);

    expect(screen.getByText("Success")).toBeTruthy();
    expect(screen.getByText("Warning")).toBeTruthy();
    expect(container.querySelector('[data-fsds-icon="check"] path')).toBeTruthy();
    expect(container.querySelector('[data-fsds-icon="triangle-alert"] path')).toBeTruthy();
  });

  it("materializes JSON dates and renders Calendar captions and day labels", () => {
    const { container } = render(<UsageExamples component={component("Calendar")} />);

    // Each example's JSON defaultMonth materializes to a Date: an unmaterialized
    // string would fall back to the current month.
    expect(screen.getAllByText("September 2026")).toHaveLength(3);
    // Each day is a gridcell named by its locale-formatted full date: two en-US
    // examples, one de-DE.
    expect(screen.getAllByRole("gridcell", { name: "Tuesday, September 1, 2026" })).toHaveLength(2);
    expect(screen.getByRole("gridcell", { name: "Dienstag, 1. September 2026" })).toBeTruthy();
    // The range example's [8, 12] span selects five days.
    const selected = [...container.querySelectorAll('[role="gridcell"][aria-selected="true"][data-date]')];
    expect(selected.map((day) => day.getAttribute("data-date"))).toEqual(
      ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12"],
    );
  });

  it("renders Command item content inside its isolated portal canvas", async () => {
    render(<UsageExamples component={component("Command")} />);

    fireEvent.click(screen.getByRole("button", { name: "Open command" }));
    const item = await screen.findByText("Go to Dashboard");
    expect(item.closest("[data-fsds-preview-portal]")).toBeTruthy();
    expect(screen.getByText("View your project overview")).toBeTruthy();
  });

  it.each(["Accordion", "Card", "Popover", "Table", "Tabs", "Tooltip"])(
    "renders %s through declared compound parts without a usage fallback",
    (name) => {
      const { container } = render(<UsageExamples component={component(name)} />);
      expect(container.textContent).not.toContain("[usage fallback]");
    },
  );

  it("preserves the native table content model in the curated example", () => {
    const { container } = render(<UsageExamples component={component("Table")} />);
    const table = container.querySelector("table");

    expect(table?.querySelectorAll(":scope > caption")).toHaveLength(1);
    expect(table?.querySelectorAll(":scope > thead > tr > th")).toHaveLength(3);
    expect(table?.querySelectorAll(":scope > tbody > tr")).toHaveLength(2);
    expect(table?.querySelectorAll(":scope > tfoot > tr > td")).toHaveLength(1);
    expect(table?.querySelector("tfoot td")?.getAttribute("colspan")).toBe("3");
  });

  it("renders stateful compound examples with their public trigger and panel APIs", () => {
    const accordion = render(<UsageExamples component={component("Accordion")} />);
    expect(screen.getAllByRole("button", { name: "What is a design system?" })).toHaveLength(1);
    expect(
      screen.getAllByRole("region").some((region) =>
        region.textContent?.includes("A design system is a collection"),
      ),
    ).toBe(true);
    accordion.unmount();

    render(<UsageExamples component={component("Tabs")} />);
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getAllByRole("tabpanel").length).toBeGreaterThan(0);
  });

  it.each(bundle.components.map((entry) => entry.name))(
    "renders every curated %s example with content and portal confinement",
    async (name) => {
      const entry = component(name);
      const { container } = render(<UsageExamples component={entry} />);
      expect(document.body.textContent).not.toContain("[usage fallback]");

      const frames = container.querySelectorAll<HTMLElement>("[data-usage-preview]");
      expect(frames).toHaveLength(entry.usage.length);
      for (const frame of frames) {
        const hasText = Boolean(frame.textContent?.trim());
        const hasStructuralWitness = Boolean(frame.querySelector(
          // `progress` and `hr` carry implicit progressbar/separator roles, so
          // role-elided components witness by element; attribute selectors
          // cover explicit roles on non-native hosts.
          "svg path, img[src], input, textarea, select, button, progress, hr, [role='separator'], [role='progressbar'], [role='status'], [aria-busy='true'], [aria-hidden='true']",
        ));
        expect(
          hasText || hasStructuralWitness,
          `${frame.dataset.usagePreview} rendered no content witness`,
        ).toBe(true);
      }

      const slug = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      // Showcase Card frames are app chrome; only the subject roots must be
      // confined to a preview. Keep the body-wide scan to catch portal leaks.
      const subjectSelector = `.${slug}:not([data-usage-example])`;
      const launchers = container.querySelectorAll<HTMLButtonElement>(".usage-launcher > button");
      if (launchers.length) {
        expect(document.body.querySelectorAll(subjectSelector)).toHaveLength(0);
        expect(launchers).toHaveLength(entry.usage.length);
        for (const launcher of launchers) {
          launcher.focus();
          fireEvent.click(launcher);
          await waitFor(() => expect(document.body.querySelectorAll(subjectSelector)).toHaveLength(1));
          const root = document.body.querySelector(subjectSelector)!;
          expect(root.closest("[data-usage-preview]")).toBeTruthy();
          fireEvent.keyDown(root, { key: "Escape" });
          expect(document.body.querySelectorAll(subjectSelector)).toHaveLength(0);
          expect(document.activeElement).toBe(launcher);
        }
      } else {
        await waitFor(() => {
          const roots = document.body.querySelectorAll(subjectSelector);
          expect(roots.length).toBeGreaterThanOrEqual(entry.usage.length);
          for (const root of roots) expect(root.closest("[data-usage-preview]")).toBeTruthy();
        });
      }
    },
  );

  it("runs the tour through previous, next, dot, finish and reopen actions", () => {
    render(<UsageExamples component={component("Walkthrough")} />);
    const launch = screen.getByRole("button", { name: "Start walkthrough" });
    fireEvent.click(launch);
    const tour = screen.getByRole("status", { name: "Dashboard onboarding tour" });
    const controls = within(tour);
    expect(controls.getByText("1 of 3")).toBeTruthy();
    expect(controls.getByRole("button", { name: "Previous step" })).toHaveProperty("disabled", true);
    fireEvent.click(controls.getByRole("button", { name: "Next", exact: true }));
    expect(controls.getByText("2 of 3")).toBeTruthy();
    fireEvent.click(controls.getByRole("button", { name: "Previous step" }));
    expect(controls.getByText("1 of 3")).toBeTruthy();
    fireEvent.click(controls.getByRole("button", { name: "Make it yours" }));
    expect(controls.getByText("3 of 3")).toBeTruthy();
    expect(controls.getByRole("button", { name: "Finish", exact: true }).textContent).toBe("Finish");
    fireEvent.click(controls.getByRole("button", { name: "Finish", exact: true }));
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(launch);
    expect(screen.getByText("1 of 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(document.activeElement).toBe(launch);
  });

  it("realizes contract-declared glyph and indicator components", async () => {
    const accordion = render(<UsageExamples component={component("Accordion")} />);
    expect(accordion.container.querySelector('[data-fsds-icon="chevron-down"]')).toBeTruthy();
    accordion.unmount();

    const details = render(<UsageExamples component={component("Details")} />);
    expect(details.container.querySelector('[data-fsds-icon="chevron-down"]')).toBeTruthy();
    details.unmount();

    render(<UsageExamples component={component("Command")} />);
    fireEvent.click(screen.getByRole("button", { name: "Open command" }));
    expect(await screen.findByText("Go to Dashboard")).toBeTruthy();
    expect(document.body.querySelector('[data-fsds-icon="search"]')).toBeTruthy();

    render(<UsageExamples component={component("Button")} />);
    expect(document.body.querySelector('[data-fsds-component="spinner"]')).toBeTruthy();
  });

  it("supplies every consumer-supplied required region in every curated frame occurrence", () => {
    // slots[].required binding (FEAT-SLOT-REQUIRED-USAGE-BINDING-01): for
    // consumer-supplied regions (named slots + public subcomponents), a
    // curated frame omitting a required region demonstrates an invalid
    // composition. Component-owned anchors (the anchor-presence sense) and
    // the root host anchor are excluded by deriveRequiredRegionObligations.
    //
    // FIX-SLOT-REQUIRED-OWNERSHIP-01: the check is per OCCURRENCE. A nested
    // component root is its own ownership context — its supply never
    // discharges the enclosing occurrence — and part-ref delivery requires
    // the enclosing occurrence's component to match. Obligated occurrences
    // nested inside other components' frames are checked too.
    const obligationsByComponent = new Map<string, ReturnType<typeof deriveRequiredRegionObligations>>();
    const obligationsFor = (name: string) => {
      let cached = obligationsByComponent.get(name);
      if (!cached) {
        const entry = bundle.components.find((c) => c.name === name);
        cached = entry ? deriveRequiredRegionObligations(entry.contract as never) : [];
        obligationsByComponent.set(name, cached);
      }
      return cached;
    };
    for (const entry of bundle.components) {
      if (!entry.usage.length) continue;
      for (const frame of entry.usage) {
        const violations = findRequiredRegionViolations(frame.tree, obligationsFor);
        for (const v of violations) {
          expect(
            false,
            `[USAGE-REQUIRED-SLOT-MISSING] ${entry.name}[${frame.name}]: ${v.component} at ${v.path} missing required region "${v.region}" (supplied: ${v.supplied.join(", ") || "none"})`,
          ).toBe(true);
        }
      }
    }
    // The sweep must observe real obligations (Field.control) so it cannot
    // trivially pass by finding none.
    const totalObligations = [...obligationsByComponent.values()].reduce((sum, obs) => sum + obs.length, 0);
    expect(totalObligations).toBeGreaterThan(0);
  });

});
