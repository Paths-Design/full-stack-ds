// View render-smoke suites: each view renders against the real bundle data
// and asserts its headline surface. Presentation views were the largest
// 0%-coverage block in the showcase package.
import { describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { bundle } from "../types/bundle";
import { Home } from "./Home";
import { ArchitectureView } from "./ArchitectureView";
import { DisplayCaseView } from "./DisplayCaseView";
import { TokensPhilosophyView } from "./TokensPhilosophyView";
import { ComponentStandardsView } from "./ComponentStandardsView";
import { ComponentComplexityView } from "./ComponentComplexityView";
import { PropertiesScratchView } from "./PropertiesScratchView";
import { DesignView } from "./DesignView";
import { DeveloperView } from "./DeveloperView";

afterEach(cleanup);

describe("showcase views — render smoke", () => {
  it("Home renders the census-driven overview", () => {
    render(<Home bundle={bundle} />);
    expect(document.querySelector("h1")).toBeTruthy();
    expect(document.body.textContent).toContain("component");
  });

  it("Home separates corpus source coverage, rail membership and rendered primitives", () => {
    render(<Home bundle={bundle} />);
    expect(screen.getByText("Targets with full corpus source coverage")).toBeTruthy();
    expect(screen.getByText("Rendered primitives").previousElementSibling?.textContent).toBe("1");
    expect(screen.getByText(/BoxModel supplies shared geometry defaults/)).toBeTruthy();
    for (const label of ["Jetpack Compose", "Unity UI Toolkit", "Godot Control"]) {
      expect(screen.getByText(label, { selector: "strong" })).toBeTruthy();
    }
    expect(screen.getAllByText("Admission rail target")).toHaveLength(6);
    expect(screen.getAllByText("Outside the admission rail")).toHaveLength(5);
    expect(document.body.textContent).not.toContain("Targets at full parity");
    expect(document.body.textContent).not.toContain("no component package yet");
    expect(bundle.census?.targets.find((t) => t.id === "figma")?.family).toBe("descriptor");
  });

  it("ArchitectureView renders the claim summary", () => {
    render(<ArchitectureView bundle={bundle} />);
    expect(document.querySelector("h1")?.textContent).toContain("compositional");
    expect(document.body.textContent).toContain("packages/ds-contracts/components/<Name>/<Name>.contract.json");
    expect(document.body.textContent).toContain("Neither attests the showcase build itself");
    expect(document.body.textContent).not.toContain("attests its own artifacts");
  });

  it("DisplayCaseView renders the component gallery", () => {
    render(<DisplayCaseView bundle={bundle} />);
    expect(document.querySelector("h1")).toBeTruthy();
  });

  it("TokensPhilosophyView renders the philosophy tabs", () => {
    render(<TokensPhilosophyView tab="overview" />);
    expect(document.querySelector("h1")).toBeTruthy();
    expect(document.body.textContent).toContain("Philosophy");
  });

  it("TokensPhilosophyView topics are a grouped link nav, not a tablist", () => {
    render(<TokensPhilosophyView tab="accessibility" />);
    const nav = document.querySelector('nav[aria-label="Tokens philosophy topics"]');
    expect(nav).toBeTruthy();
    // Every topic remains reachable: 11 links across the grouped rail.
    expect(nav?.querySelectorAll("a")).toHaveLength(11);
    // Route-level navigation marks the current topic, and must not
    // masquerade as a tablist (no tab panels exist to control).
    expect(nav?.querySelector('[aria-current="page"]')?.textContent).toContain(
      "Contrast, motion & focus",
    );
    expect(document.querySelector('[role="tablist"]')).toBeNull();
  });

  it("ComponentStandardsView renders the standards tabs", () => {
    render(<ComponentStandardsView tab="overview" />);
    expect(document.querySelector("h1")).toBeTruthy();
    expect(document.body.textContent).toContain("Overview");
  });

  it("ComponentComplexityView renders the complexity tabs", () => {
    render(<ComponentComplexityView tab="overview" />);
    expect(document.querySelector("h1")).toBeTruthy();
  });

  it("PropertiesScratchView renders the property sandbox", () => {
    render(<PropertiesScratchView />);
    expect(document.querySelector("h1")).toBeTruthy();
  });

  it("DesignView renders the component surface for the first component", () => {
    render(<DesignView component={bundle.components[0]} />);
    expect(document.querySelector("h1")).toBeTruthy();
    expect(screen.getAllByText(bundle.components[0].name).length).toBeGreaterThan(0);
  });

  it("DeveloperView renders the developer surface", () => {
    render(<DeveloperView component={bundle.components[0]} />);
    expect(document.querySelector("h1")).toBeTruthy();
  });
});
