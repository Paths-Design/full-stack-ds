// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { TabsComponent } from "../Tabs.component";
// @generated:end

// @generated:start tests
describe("Tabs — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TabsComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    expect(fixture.componentInstance).toBeInstanceOf(TabsComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    expect(classTokens(fixture.componentInstance)).toContain("tabs");
  });

  it("applies orientation=horizontal variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.orientation = "horizontal";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--horizontal");
  });

  it("applies orientation=vertical variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.orientation = "vertical";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--vertical");
  });

  it("applies appearance=underline variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.appearance = "underline";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--underline");
  });

  it("applies appearance=pills variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.appearance = "pills";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--pills");
  });

  it("applies activationMode=automatic variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.activationMode = "automatic";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--automatic");
  });

  it("applies activationMode=manual variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.activationMode = "manual";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--manual");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [TabsComponent],
  template: "<fsds-tabs aria-label=\"Test Tabs\"><span>content</span></fsds-tabs>",
})
class TabsAxeHost {}

describe("Tabs — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [TabsAxeHost] });
    const fixture = TestBed.createComponent(TabsAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".tabs");
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

// @custom:end
