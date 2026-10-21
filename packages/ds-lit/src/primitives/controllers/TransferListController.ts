import type { ReactiveController, ReactiveControllerHost } from "lit";
import { createTransferList, type TransferListItem, type TransferListKeyEvent, type TransferListOptions } from "../transfer/transfer-list.js";

/**
 * Lit binding for the transfer-list core: derives both lists before each
 * render, requests an update when a mark or the focused item changes, and
 * lets focus follow a key press once the update has rendered.
 */
export class TransferListController implements ReactiveController {
  private transfer = createTransferList();
  private unsubscribe?: () => void;
  constructor(private host: ReactiveControllerHost, private options: () => TransferListOptions) { host.addController(this); }
  hostConnected() { this.unsubscribe = this.transfer.subscribe(() => this.host.requestUpdate()); }
  hostUpdate() { this.transfer.sync(this.options()); }
  hostUpdated() { this.transfer.afterRender(); }
  hostDisconnected() { this.unsubscribe?.(); }
  get state() { return this.transfer.state; }
  add = () => this.transfer.add();
  remove = () => this.transfer.remove();
  toggle = (item: TransferListItem) => this.transfer.toggle(item);
  keydown = (event: TransferListKeyEvent) => this.transfer.keydown(event);
}
