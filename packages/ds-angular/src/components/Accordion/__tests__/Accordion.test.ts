// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { AccordionComponent } from "../Accordion.component";
// @generated:end

// @generated:start tests
describe("Accordion — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AccordionComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(AccordionComponent);
    expect(fixture.componentInstance).toBeInstanceOf(AccordionComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(AccordionComponent);
    expect(classTokens(fixture.componentInstance)).toContain("accordion");
  });

  it("applies type=single variant class", () => {
    const fixture = TestBed.createComponent(AccordionComponent);
    fixture.componentInstance.type = "single";
    expect(classTokens(fixture.componentInstance)).toContain("accordion--single");
  });

  it("applies type=multiple variant class", () => {
    const fixture = TestBed.createComponent(AccordionComponent);
    fixture.componentInstance.type = "multiple";
    expect(classTokens(fixture.componentInstance)).toContain("accordion--multiple");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [AccordionComponent],
  template: "<fsds-accordion><span>content</span></fsds-accordion>",
})
class AccordionAxeHost {}

describe("Accordion — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [AccordionAxeHost] });
    const fixture = TestBed.createComponent(AccordionAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".accordion");
    expect(root).not.toBeNull();
    const results = await axe.run(root as HTMLElement, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests
import { AccordionItemComponent } from "../AccordionItem.component";
import { AccordionTriggerComponent } from "../AccordionTrigger.component";
import { AccordionContentComponent } from "../AccordionContent.component";

// FIX-COMPOUND-CONTAINER-ANCESTOR-PREDICATE-01 (A2, Angular).
@Component({
  standalone: true,
  imports: [
    AccordionComponent,
    AccordionItemComponent,
    AccordionTriggerComponent,
    AccordionContentComponent,
  ],
  template: `
    <fsds-accordion [type]="type" [defaultValue]="defaultValue" [collapsible]="collapsible">
      <fsds-accordion-item>
        <fsds-accordion-trigger value="a">First</fsds-accordion-trigger>
        <fsds-accordion-content value="a">Panel A</fsds-accordion-content>
      </fsds-accordion-item>
      <fsds-accordion-item>
        <fsds-accordion-trigger value="b">Second</fsds-accordion-trigger>
        <fsds-accordion-content value="b">Panel B</fsds-accordion-content>
      </fsds-accordion-item>
    </fsds-accordion>
  `,
})
class AccordionHost {
  type: "single" | "multiple" = "single";
  defaultValue?: string | string[];
  collapsible = false;
}

describe("Accordion — disclosure behavior", () => {
  function setup(overrides: Partial<AccordionHost> = {}) {
    TestBed.configureTestingModule({ imports: [AccordionHost] });
    const fixture = TestBed.createComponent(AccordionHost);
    Object.assign(fixture.componentInstance, overrides);
    fixture.detectChanges();
    return fixture;
  }
  function triggers(fixture: ReturnType<typeof setup>): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll("button"),
    );
  }

  it("clicking a trigger expands its own panel through the openness channel", () => {
    const fixture = setup({ type: "single" });
    const first = triggers(fixture)[0];
    expect(first.getAttribute("aria-expanded")).toBe("false");
    first.click();
    fixture.detectChanges();
    expect(triggers(fixture)[0].getAttribute("aria-expanded")).toBe("true");
    const region = (fixture.nativeElement as HTMLElement).querySelector('[role="region"]')!;
    expect(region).toBeTruthy();
    expect(region.getAttribute("aria-labelledby")).toBe(triggers(fixture)[0].getAttribute("id"));
  });

  it("single mode: opening a second item closes the first", () => {
    const fixture = setup({ type: "single" });
    triggers(fixture)[0].click();
    fixture.detectChanges();
    expect(triggers(fixture)[0].getAttribute("aria-expanded")).toBe("true");
    triggers(fixture)[1].click();
    fixture.detectChanges();
    expect(triggers(fixture)[1].getAttribute("aria-expanded")).toBe("true");
    expect(triggers(fixture)[0].getAttribute("aria-expanded")).toBe("false");
  });

  it("multiple mode: both items can be open at once", () => {
    const fixture = setup({ type: "multiple" });
    triggers(fixture)[0].click();
    fixture.detectChanges();
    triggers(fixture)[1].click();
    fixture.detectChanges();
    expect(triggers(fixture)[0].getAttribute("aria-expanded")).toBe("true");
    expect(triggers(fixture)[1].getAttribute("aria-expanded")).toBe("true");
  });

  it("reads the repeated channel default after parent inputs arrive", () => {
    const fixture = setup({ type: "multiple", defaultValue: ["b"] });
    expect(triggers(fixture).map(trigger => trigger.getAttribute("aria-expanded"))).toEqual(["false", "true"]);
    triggers(fixture)[0].click();
    fixture.detectChanges();
    expect(triggers(fixture).map(trigger => trigger.getAttribute("aria-expanded"))).toEqual(["true", "true"]);
  });

  it("emits disclosure ARIA, not tab ARIA", () => {
    const fixture = setup({ type: "single" });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="tab"]')).toBeNull();
    expect(host.querySelector('[role="tablist"]')).toBeNull();
    expect(host.querySelector('[aria-selected]')).toBeNull();
  });
});

// The generated scan renders the root alone; the triggers, regions and their
// relationships exist only in a composition.
describe("Accordion — accessibility (composed)", () => {
  it("a composed Accordion with an open item has no unexpected axe violations", async () => {
    TestBed.configureTestingModule({ imports: [AccordionHost] });
    const fixture = TestBed.createComponent(AccordionHost);
    fixture.componentInstance.defaultValue = "a";
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll("button[aria-expanded]")).toHaveLength(2);
    expect(host.querySelector('[role="region"]')?.textContent).toContain("Panel A");
    const results = await axe.run(host, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

// @custom:end
