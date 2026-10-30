import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { ShuttleComponent } from "../../components/Shuttle/Shuttle.component";
import { shuttleContract } from "../../../../ds-react/src/primitives/hooks/__tests__/shuttle.contract";

beforeEach(() => {
  TestBed.configureTestingModule({ imports: [ShuttleComponent] });
});

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.innerHTML = "";
});

shuttleContract(
  "angular",
  {
    async mount(props) {
      const fixture = TestBed.createComponent(ShuttleComponent);
      for (const [name, value] of Object.entries(props)) fixture.componentRef.setInput(name, value);
      // Focus moves need the fixture in the document.
      document.body.append(fixture.nativeElement as HTMLElement);
      fixture.detectChanges();
      await fixture.whenStable();
      const root = (fixture.nativeElement as HTMLElement).querySelector(".shuttle");
      if (!root) throw new Error("missing .shuttle");
      return {
        root,
        async act(interaction) {
          interaction();
          fixture.detectChanges();
          await fixture.whenStable();
          fixture.detectChanges();
        },
      };
    },
  },
  { describe, it, expect },
);
