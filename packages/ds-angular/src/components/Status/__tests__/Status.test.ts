// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { StatusComponent } from "../Status.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(StatusComponent);
  fixture.componentInstance["status"] = "info" as never;
  return fixture;
}

describe("Status — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StatusComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(StatusComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("status");
  });

  it("applies status=info variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "info";
    expect(classTokens(fixture.componentInstance)).toContain("status--info");
  });

  it("applies status=success variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "success";
    expect(classTokens(fixture.componentInstance)).toContain("status--success");
  });

  it("applies status=warning variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "warning";
    expect(classTokens(fixture.componentInstance)).toContain("status--warning");
  });

  it("applies status=danger variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "danger";
    expect(classTokens(fixture.componentInstance)).toContain("status--danger");
  });

  it("applies status=error variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "error";
    expect(classTokens(fixture.componentInstance)).toContain("status--error");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [StatusComponent],
  template: "<fsds-status [status]=\"status\" aria-label=\"Test Status\"><span>content</span></fsds-status>",
})
class StatusAxeHost {
  readonly status = "info";
}

describe("Status — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [StatusAxeHost] });
    const fixture = TestBed.createComponent(StatusAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".status");
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
