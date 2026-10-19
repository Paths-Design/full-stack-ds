import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, type Component } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import Calendar from "../../components/Calendar/Calendar.vue";
import { calendarContract } from "../../../../ds-react/src/primitives/hooks/__tests__/calendar.contract";

const mounted: VueWrapper[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
  document.body.innerHTML = "";
});

calendarContract(
  "vue",
  {
    async mount(props, options = {}) {
      const host = document.body.appendChild(document.createElement("div"));
      const wrapper = mount(
        defineComponent({ render: () => h("div", { dir: options.dir }, [h(Calendar as Component, { ...props })]) }),
        { attachTo: host },
      );
      mounted.push(wrapper);
      await nextTick();
      const root = host.querySelector(".calendar");
      if (!root) throw new Error("missing .calendar");
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
