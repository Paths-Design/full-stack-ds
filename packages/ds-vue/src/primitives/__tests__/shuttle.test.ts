import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, type Component } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import Shuttle from "../../components/Shuttle/Shuttle.vue";
import { shuttleContract } from "../../../../ds-react/src/primitives/hooks/__tests__/shuttle.contract";

const mounted: VueWrapper[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
  document.body.innerHTML = "";
});

it("uses the latest consumer callback after it is added, replaced or removed", async () => {
  const wrapper = mount(Shuttle as Component, { props: { options: ["alpha", "beta"] } });
  mounted.push(wrapper);
  const first = vi.fn();
  const second = vi.fn();
  await wrapper.setProps({ onValueChange: first });
  await wrapper.find('[data-side="available"] [data-value="alpha"]').trigger("click");
  await wrapper.find(".shuttle__add").trigger("click");
  expect(first.mock.calls).toEqual([[["alpha"]]]);
  await wrapper.setProps({ onValueChange: second });
  await wrapper.find('[data-side="available"] [data-value="beta"]').trigger("click");
  await wrapper.find(".shuttle__add").trigger("click");
  expect(first.mock.calls).toEqual([[["alpha"]]]);
  expect(second.mock.calls).toEqual([[["alpha", "beta"]]]);
  await wrapper.setProps({ onValueChange: undefined });
  await wrapper.find('[data-side="selected"] [data-value="alpha"]').trigger("click");
  await wrapper.find(".shuttle__remove").trigger("click");
  expect(second.mock.calls).toEqual([[["alpha", "beta"]]]);
  expect(wrapper.findAll('[data-side="selected"] [data-value]').map((item) => item.attributes("data-value"))).toEqual(["beta"]);
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
