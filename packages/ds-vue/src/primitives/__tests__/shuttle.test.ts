import { afterEach, describe, expect, it } from "vitest";
import { nextTick, type Component } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import Shuttle from "../../components/Shuttle/Shuttle.vue";
import { shuttleContract } from "../../../../ds-react/src/primitives/hooks/__tests__/shuttle.contract";

const mounted: VueWrapper[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
  document.body.innerHTML = "";
});

shuttleContract(
  "vue",
  {
    async mount(props) {
      const host = document.body.appendChild(document.createElement("div"));
      const wrapper = mount(Shuttle as Component, { props: { ...props }, attachTo: host });
      mounted.push(wrapper);
      await nextTick();
      const root = host.querySelector(".shuttle");
      if (!root) throw new Error("missing .shuttle");
      return {
        root,
        async act(interaction) {
          interaction();
          // One tick renders the update; the second runs onUpdated-driven focus.
          await nextTick();
          await nextTick();
        },
      };
    },
  },
  { describe, it, expect },
);
