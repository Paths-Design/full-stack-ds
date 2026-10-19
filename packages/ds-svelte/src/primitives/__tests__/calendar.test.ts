import { afterEach, describe, expect, it } from "vitest";
import { flushSync, tick, type Component } from "svelte";
import { cleanup, render } from "@testing-library/svelte";
import CalendarComponent from "../../components/Calendar/Calendar.svelte";
import { calendarContract } from "../../../../ds-react/src/primitives/hooks/__tests__/calendar.contract";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const Calendar = CalendarComponent as unknown as Component<Record<string, unknown>>;

calendarContract(
  "svelte",
  {
    async mount(props, options = {}) {
      const target = document.body.appendChild(document.createElement("div"));
      if (options.dir) target.setAttribute("dir", options.dir);
      render(Calendar, { props: { ...props }, target });
      await tick();
      const root = target.querySelector(".calendar");
      if (!root) throw new Error("missing .calendar");
      return {
        root,
        async act(interaction) {
          interaction();
          flushSync();
          await tick();
        },
      };
    },
  },
  { describe, it, expect },
);
