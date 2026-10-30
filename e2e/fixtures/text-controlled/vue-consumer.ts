import { createApp } from "vue";
import Parent from "./Parent.vue";
export function mountParent(target: HTMLElement, onRequest: (value: string) => void) {
  return createApp(Parent, { onRequest }).mount(target);
}
