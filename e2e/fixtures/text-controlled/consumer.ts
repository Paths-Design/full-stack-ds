import { mount } from "svelte";
import Parent from "./Parent.svelte";
export function mountParent(target: HTMLElement, onRequest: (value: string) => void) {
  return mount(Parent, { target, props: { onRequest } });
}
