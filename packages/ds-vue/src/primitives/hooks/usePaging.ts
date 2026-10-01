import { onBeforeUnmount, shallowRef, watchEffect } from "vue";
import { createPagedSet, type PagedSetOptions } from "../paging.js";
export function usePagedSet(options: () => PagedSetOptions) {
  const pagedSet = createPagedSet();
  const state = shallowRef(pagedSet.state);
  const unsubscribe = pagedSet.subscribe(() => { state.value = pagedSet.state; });
  watchEffect(() => pagedSet.sync(options()), { flush: "post" });
  onBeforeUnmount(unsubscribe);
  return { ...pagedSet, get state() { return state.value; } };
}
