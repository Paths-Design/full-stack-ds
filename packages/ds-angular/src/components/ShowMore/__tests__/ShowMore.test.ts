// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { ShowMoreComponent } from "../ShowMore.component";
// @generated:end

// @generated:start tests
describe("ShowMore — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ShowMoreComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ShowMoreComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ShowMoreComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ShowMoreComponent);
    expect(classTokens(fixture.componentInstance)).toContain("show-more");
  });

  it("toggles the expanded channel from the trigger click", () => {
    const fixture = TestBed.createComponent(ShowMoreComponent);
    const seen: boolean[] = [];
    fixture.componentInstance.onExpandedChange = (v: boolean) => seen.push(v);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(".show-more__trigger") as HTMLElement;
    host.click();
    expect(seen).toEqual([true]);
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ShowMoreComponent],
  template: "<fsds-show-more><span>content</span></fsds-show-more>",
})
class ShowMoreAxeHost {}

describe("ShowMore — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ShowMoreAxeHost] });
    const fixture = TestBed.createComponent(ShowMoreAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".show-more");
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
describe("ShowMore — channel lifecycle", () => {
  beforeEach(() => { TestBed.configureTestingModule({ imports: [ShowMoreComponent] }); });

  it("reads the initial default after inputs arrive and does not reapply it", () => {
    const fixture = TestBed.createComponent(ShowMoreComponent);
    fixture.componentRef.setInput("defaultExpanded", true);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector("button") as HTMLButtonElement;
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fixture.componentRef.setInput("defaultExpanded", false);
    fixture.detectChanges();
    fixture.componentRef.setInput("defaultExpanded", true);
    fixture.detectChanges();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("notifies once and follows every controlled parent update without committing locally", () => {
    const fixture = TestBed.createComponent(ShowMoreComponent);
    const seen: boolean[] = [];
    fixture.componentRef.setInput("onExpandedChange", (next: boolean) => seen.push(next));
    for (const expanded of [false, true, false]) {
      fixture.componentRef.setInput("expanded", expanded);
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelector("button") as HTMLButtonElement;
      expect(trigger.getAttribute("aria-expanded")).toBe(String(expanded));
      trigger.click();
      fixture.detectChanges();
      expect(trigger.getAttribute("aria-expanded")).toBe(String(expanded));
    }
    expect(seen).toEqual([true, false, true]);
  });
});

// @custom:end
