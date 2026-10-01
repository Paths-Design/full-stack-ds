import { signal } from "@angular/core";
import { createPagedSet } from "./paging.js";
export function createReactivePagedSet() {
  const pagedSet = createPagedSet();
  const state = signal(pagedSet.state);
  const unsubscribe = pagedSet.subscribe(() => { state.set(pagedSet.state); });
  return { ...pagedSet, get state() { return state(); }, destroy: unsubscribe };
}
