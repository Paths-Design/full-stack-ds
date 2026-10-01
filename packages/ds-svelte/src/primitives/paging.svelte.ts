import { createPagedSet } from "./paging.js";
export function createReactivePagedSet() {
  const pagedSet = createPagedSet();
  let state = $state(pagedSet.state);
  const unsubscribe = pagedSet.subscribe(() => { state = pagedSet.state; });
  return { ...pagedSet, get state() { return state; }, destroy: unsubscribe };
}
