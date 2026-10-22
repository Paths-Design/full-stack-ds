import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { Shuttle } from "../../../components/Shuttle/Shuttle";
import { shuttleContract } from "./shuttle.contract";

afterEach(cleanup);

shuttleContract(
  "react",
  {
    async mount(props) {
      const { container } = render(<Shuttle {...props} />);
      const root = container.querySelector(".shuttle");
      if (!root) throw new Error("missing .shuttle");
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
