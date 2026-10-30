import { afterEach, describe, expect, it } from "vitest";
import type { LitElement } from "lit";
import "../../components/Shuttle/Shuttle";
import { shuttleContract } from "../../../../ds-react/src/primitives/hooks/__tests__/shuttle.contract";

afterEach(() => {
  document.body.replaceChildren();
});

shuttleContract(
  "lit",
  {
    async mount(props) {
      const element = document.createElement("fsds-shuttle") as LitElement;
      Object.assign(element, props);
      document.body.append(element);
      await element.updateComplete;
      const root = element.shadowRoot?.querySelector(".shuttle");
      if (!root) throw new Error("missing .shuttle");
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
