import { computed, signal } from "@angular/core";
import { createTransferList, type TransferListOptions } from "./transfer/transfer-list.js";

/**
 * Angular binding for the transfer-list core: both lists are a computed over
 * the options (read from signal-backed inputs and channel signals) and the
 * core's version. The component calls `afterRender` from
 * `ngAfterViewChecked` so focus follows a key press.
 */
export function createReactiveTransferList(options: () => TransferListOptions) {
  const transfer = createTransferList();
  const version = signal(0);
  const unsubscribe = transfer.subscribe(() => version.set(transfer.version));
  const state = computed(() => {
    version();
    return transfer.sync(options());
  });
  return {
    get state() { return state(); },
    add: transfer.add,
    remove: transfer.remove,
    toggle: transfer.toggle,
    keydown: transfer.keydown,
    afterRender: transfer.afterRender,
    destroy: unsubscribe,
  };
}
