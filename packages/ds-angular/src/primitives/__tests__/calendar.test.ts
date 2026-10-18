import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { CalendarComponent } from "../../components/Calendar/Calendar.component";
import { calendarContract } from "../../../../ds-react/src/primitives/hooks/__tests__/calendar.contract";

beforeEach(() => {
  TestBed.configureTestingModule({ imports: [CalendarComponent] });
});
afterEach(() => {
  TestBed.resetTestingModule();
});

calendarContract(
  "angular",
  {
    async mount(props, options = {}) {
      const fixture = TestBed.createComponent(CalendarComponent);
      for (const [name, value] of Object.entries(props)) fixture.componentRef.setInput(name, value);
      const host = fixture.nativeElement as HTMLElement;
      if (options.dir) host.setAttribute("dir", options.dir);
      fixture.detectChanges();
      await fixture.whenStable();
      const root = host.querySelector(".calendar");
      if (!root) throw new Error("missing .calendar");
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

describe("angular Calendar inputs", () => {
  it("a locale input change re-renders the grid", async () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.componentRef.setInput("defaultMonth", new Date(2031, 2, 1));
    fixture.detectChanges();
    const caption = () => (fixture.nativeElement as HTMLElement).querySelector(".calendar__caption")!.textContent!.trim();
    expect(caption()).toBe("March 2031");
    fixture.componentRef.setInput("locale", "de-DE");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(caption()).toBe("März 2031");
  });
});
