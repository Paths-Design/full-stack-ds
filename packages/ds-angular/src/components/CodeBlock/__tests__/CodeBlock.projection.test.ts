import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, it } from "@jest/globals";
import { CodeBlockComponent } from "../CodeBlock.component";

@Component({
  standalone: true,
  imports: [CodeBlockComponent],
  template: `<fsds-code-block code="canonical" language="plaintext"><span>annotated</span></fsds-code-block>`,
})
class AnnotatedSourceFixture {}

it("replaces automatic source with projected annotations", () => {
  TestBed.configureTestingModule({ imports: [AnnotatedSourceFixture] });
  const fixture = TestBed.createComponent(AnnotatedSourceFixture);
  fixture.detectChanges();
  const code = (fixture.nativeElement as HTMLElement).querySelector("code");
  expect(code?.textContent).toBe("annotated");
  expect(code?.querySelector(".code-block__source")).toBeNull();
});
