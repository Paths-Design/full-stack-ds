import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { Calendar } from "../../../components/Calendar/Calendar";
import { calendarContract } from "./calendar.contract";

afterEach(cleanup);

calendarContract(
  "react",
  {
    async mount(props, options = {}) {
      const { container } = render(
        <div dir={options.dir}>
          <Calendar {...props} />
        </div>,
      );
      const root = container.querySelector(".calendar");
      if (!root) throw new Error("missing .calendar");
      return {
        root,
        async act(interaction) {
          await act(async () => { interaction(); });
        },
      };
    },
  },
  { describe, it, expect },
);
