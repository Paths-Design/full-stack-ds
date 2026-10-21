import { useEffect, useRef, useSyncExternalStore } from "react";
import { createTransferList, type TransferListOptions } from "../transfer/transfer-list.js";

/**
 * React binding for the transfer-list core: derives both lists on every
 * render, re-renders when a mark or the focused item changes, and lets focus
 * follow a key press once the targeted item is in the DOM.
 */
export function useTransferList(options: TransferListOptions) {
  const controller = useRef<ReturnType<typeof createTransferList> | null>(null);
  if (!controller.current) controller.current = createTransferList();
  const transfer = controller.current;
  useSyncExternalStore(transfer.subscribe, () => transfer.version, () => transfer.version);
  transfer.sync(options);
  useEffect(() => { transfer.afterRender(); });
  return transfer;
}
