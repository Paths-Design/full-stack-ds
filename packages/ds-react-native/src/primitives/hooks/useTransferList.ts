import { useRef, useSyncExternalStore } from "react";
import { createTransferList, type TransferListOptions } from "../transfer/transfer-list";

/**
 * React Native binding for the transfer-list core: derives both lists on
 * every render and re-renders when a mark changes. Focus moves are the host
 * platform's (no key events reach a list), so `afterRender` is not called.
 */
export function useTransferList(options: TransferListOptions) {
  const controller = useRef<ReturnType<typeof createTransferList> | null>(null);
  if (!controller.current) controller.current = createTransferList();
  const transfer = controller.current;
  useSyncExternalStore(transfer.subscribe, () => transfer.version, () => transfer.version);
  transfer.sync(options);
  return transfer;
}
