// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { NavTreeComponent } from "../NavTree.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(NavTreeComponent);
  fixture.componentInstance["label"] = "placeholder" as never;
  return fixture;
}

describe("NavTree — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NavTreeComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(NavTreeComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("nav-tree");
  });

  it("applies iconSize=sm variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.iconSize = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("nav-tree--sm");
  });

  it("applies iconSize=md variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.iconSize = "md";
    expect(classTokens(fixture.componentInstance)).toContain("nav-tree--md");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [NavTreeComponent],
  template: "<fsds-nav-tree [label]=\"label\" aria-label=\"Test NavTree\"><li>content</li></fsds-nav-tree>",
})
class NavTreeAxeHost {
  readonly label = "placeholder";
}

describe("NavTree — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [NavTreeAxeHost] });
    const fixture = TestBed.createComponent(NavTreeAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".nav-tree");
    expect(root).not.toBeNull();
    const list = document.createElement("ul");
    document.body.append(list);
    list.append(root as HTMLElement);
    const results = await axe.run(list, componentAxeOptions);
    list.remove();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
