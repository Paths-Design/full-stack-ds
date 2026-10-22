import { computed, onBeforeUnmount, onUpdated, shallowRef } from "vue";
import { createTransferList, type TransferListOptions } from "../transfer/transfer-list.js";

/**
 * Vue binding for the transfer-list core: both lists are a computed over the
 * options and the core's version, and focus follows a key press once the
 * component has re-rendered.
 */
export function useTransferList(options: () => TransferListOptions) {
  const transfer = createTransferList();
  const version = shallowRef(0);
  const unsubscribe = transfer.subscribe(() => { version.value = transfer.version; });
  const state = computed(() => {
    void version.value;
    return transfer.sync(options());
  });
  onUpdated(() => transfer.afterRender());
  onBeforeUnmount(unsubscribe);
  return {
    get state() { return state.value; },
    add: transfer.add,
    remove: transfer.remove,
    toggle: transfer.toggle,
    keydown: transfer.keydown,
  };
}
