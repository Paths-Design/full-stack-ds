import { afterEach, describe, expect, it } from "vitest";
import { flushSync, tick, type Component } from "svelte";
import { cleanup, render } from "@testing-library/svelte";
import ShuttleComponent from "../../components/Shuttle/Shuttle.svelte";
import { shuttleContract } from "../../../../ds-react/src/primitives/hooks/__tests__/shuttle.contract";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const Shuttle = ShuttleComponent as unknown as Component<Record<string, unknown>>;

shuttleContract(
  "svelte",
  {
    async mount(props) {
      const target = document.body.appendChild(document.createElement("div"));
      render(Shuttle, { props: { ...props }, target });
      await tick();
      const root = target.querySelector(".shuttle");
      if (!root) throw new Error("missing .shuttle");
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
