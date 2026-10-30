import { mount } from "svelte";
import Parent from "./Parent.svelte";
import type { DialogOptions } from "./shared";
export function mountParent(target: HTMLElement, options: DialogOptions, onRequest: (value: boolean) => void) {
  return mount(Parent, { target, props: { options, onRequest } });
}
