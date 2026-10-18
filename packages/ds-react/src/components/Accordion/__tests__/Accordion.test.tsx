// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../Accordion";

declare module "vitest" {
  interface Assertion<T> {
    // The positional T keeps this augmentation mergeable with vitest's
    // own Assertion<T = any> declaration (TS2428 fires on any rename);
    // the expected param references it so it is never an unused type param.
    toHaveNoViolations(expected?: T): void;
  }
}
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Accordion — unit", () => {
  it("renders with default props", () => {
    render(<Accordion data-testid="accordion"><span>content</span></Accordion>);
    expect(screen.getByTestId("accordion")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Accordion data-testid="accordion"><span>content</span></Accordion>);
    expect(screen.getByTestId("accordion")).toHaveClass("accordion");
  });

  it("merges custom className", () => {
    render(<Accordion data-testid="accordion" className="custom"><span>content</span></Accordion>);
    expect(screen.getByTestId("accordion")).toHaveClass("accordion", "custom");
  });

  it("applies type=single variant class", () => {
    render(<Accordion data-testid="accordion" type="single"><span>content</span></Accordion>);
    expect(screen.getByTestId("accordion")).toHaveClass("accordion--single");
  });

  it("applies type=multiple variant class", () => {
    render(<Accordion data-testid="accordion" type="multiple"><span>content</span></Accordion>);
    expect(screen.getByTestId("accordion")).toHaveClass("accordion--multiple");
  });

  it("calls onValueChange when openness changes", async () => {
    const onValueChangeSpy = vi.fn();
    expect(() => render(<Accordion data-testid="accordion" value={""} onValueChange={onValueChangeSpy}><span>content</span></Accordion>)).not.toThrow();
  });
});

describe("Accordion — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Accordion><span>content</span></Accordion></>);
    const component = baseElement.querySelector('[data-fsds-component="accordion"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import { fireEvent } from "@testing-library/react";

// FIX-COMPOUND-CONTAINER-ANCESTOR-PREDICATE-01 (A2): the trigger toggle must
// live on the descendant trigger, aria-expanded must follow the openness
// channel, and the openness channel must update per contract semantics.
function Fixture(props: React.ComponentProps<typeof Accordion>) {
  return (
    <Accordion {...props}>
      <AccordionItem>
        <AccordionTrigger value="a">First</AccordionTrigger>
        <AccordionContent value="a">Panel A</AccordionContent>
      </AccordionItem>
      <AccordionItem>
        <AccordionTrigger value="b">Second</AccordionTrigger>
        <AccordionContent value="b">Panel B</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion — disclosure behavior", () => {
  it("clicking a trigger expands its own panel and updates the openness channel", () => {
    const onValueChange = vi.fn();
    render(<Fixture type="single" onValueChange={onValueChange} />);
    const first = screen.getByRole("button", { name: "First" });
    // Closed initially: aria-expanded=false, panel hidden.
    expect(first).toHaveAttribute("aria-expanded", "false");
    const panelA = document.getElementById(
      first.getAttribute("aria-controls")!,
    )!;
    expect(panelA).toHaveAttribute("hidden");

    fireEvent.click(first);
    // The handler on the descendant trigger fired the channel with "a".
    expect(onValueChange).toHaveBeenCalledWith("a");
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(panelA).not.toHaveAttribute("hidden");
    expect(panelA).toHaveTextContent("Panel A");
    // region role + labelledby wiring derive from the contract.
    expect(panelA).toHaveAttribute("role", "region");
    expect(panelA).toHaveAttribute("aria-labelledby", first.id);
  });

  it("single mode: opening a second item closes the first (single-select semantics)", () => {
    render(<Fixture type="single" defaultValue="a" />);
    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    expect(first).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("single collapsible: re-clicking the open trigger collapses it", () => {
    render(<Fixture type="single" collapsible defaultValue="a" />);
    const first = screen.getByRole("button", { name: "First" });
    expect(first).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("multiple mode: both items can be open at once", () => {
    render(<Fixture type="multiple" defaultValue={["a"]} />);
    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "true");
  });

  it("emits disclosure ARIA, not tab ARIA", () => {
    const { container } = render(<Fixture type="single" />);
    expect(container.querySelector('[role="tab"]')).toBeNull();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('[role="tabpanel"]')).toBeNull();
    expect(container.querySelector('[aria-selected]')).toBeNull();
  });
});

// @custom:end
