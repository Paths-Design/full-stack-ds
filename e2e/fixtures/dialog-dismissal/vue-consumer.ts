import { createApp, h, reactive } from "vue";
import Dialog from "../../../packages/ds-vue/src/components/Dialog/Dialog.vue";
import { provideFsdsMessages } from "../../../packages/ds-vue/src/primitives/messages";
import { catalog, initialState, type DialogOptions } from "./shared";
export function mountParent(target: HTMLElement, options: DialogOptions, onRequest: (value: boolean) => void) {
  const state = reactive(initialState(options)); let accepting = false;
  const api = { setAccepting(value: boolean) { accepting = value; }, setOpen(value: boolean) { state.open = value; }, setOptions(options: DialogOptions) { Object.assign(state, options); } };
  createApp({ setup() {
    provideFsdsMessages(catalog);
    return () => h(Dialog, { ...state, onOpenChange(next: boolean) { onRequest(next); if (accepting) state.open = next; } },
      { title: () => "Release dialog", default: () => "Dialog body" });
  } }).mount(target);
  return api;
}
