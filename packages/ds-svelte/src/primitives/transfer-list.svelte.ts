import { createTransferList, type TransferListOptions } from "./transfer/transfer-list.js";

/**
 * Svelte binding for the transfer-list core: both lists are derived from the
 * options and the core's version, and focus follows a key press in an
 * effect, which runs after the DOM reflects it.
 */
export function createReactiveTransferList(options: () => TransferListOptions) {
  const transfer = createTransferList();
  let version = $state(0);
  const unsubscribe = transfer.subscribe(() => { version = transfer.version; });
  const state = $derived.by(() => {
    void version;
    return transfer.sync(options());
  });
  $effect(() => {
    void state;
    transfer.afterRender();
  });
  $effect(() => unsubscribe);
  return {
    get state() { return state; },
    add: transfer.add,
    remove: transfer.remove,
    toggle: transfer.toggle,
    keydown: transfer.keydown,
  };
}
