import { afterEach, describe, expect, it } from "vitest";
import type { LitElement } from "lit";
import "../../components/Calendar/Calendar";
import { calendarContract } from "../../../../ds-react/src/primitives/hooks/__tests__/calendar.contract";

afterEach(() => {
  document.body.replaceChildren();
});

calendarContract(
  "lit",
  {
    async mount(props, options = {}) {
      // The direction lives outside the component's shadow root, as a page sets it.
      const wrapper = document.body.appendChild(document.createElement("div"));
      if (options.dir) wrapper.setAttribute("dir", options.dir);
      const element = document.createElement("fsds-calendar") as LitElement;
      Object.assign(element, props);
      wrapper.append(element);
      await element.updateComplete;
      const root = element.shadowRoot?.querySelector(".calendar");
      if (!root) throw new Error("missing .calendar");
      return {
        root,
        async act(interaction) {
          interaction();
          await element.updateComplete;
        },
      };
    },
  },
  { describe, it, expect },
);
