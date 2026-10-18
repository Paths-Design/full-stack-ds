import type { ReactiveController, ReactiveControllerHost } from "lit";
import { resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

export { formatFsdsMessage, mergeFsdsMessageCatalogs, resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

/*
 * Lit has no component-tree context in this package, so the catalog is one
 * document-wide registry. Every connected element re-renders when it changes.
 */
let catalog: FsdsMessageCatalog | undefined;
const listeners = new Set<() => void>();

/** Install (or replace) the translated component text for every FSDS element. */
export function setFsdsMessages(messages: FsdsMessageCatalog | undefined): void {
  catalog = messages;
  for (const notify of listeners) notify();
}

/** The catalog currently installed with `setFsdsMessages`. */
export function getFsdsMessages(): FsdsMessageCatalog | undefined {
  return catalog;
}

/** A component's resolved messages: registry entries over contract defaults. */
export class FsdsMessagesController<T extends Record<string, string>> implements ReactiveController {
  private readonly notify = () => this.host.requestUpdate();

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly component: string,
    private readonly defaults: T,
  ) {
    host.addController(this);
  }

  get value(): T {
    return resolveFsdsMessages(catalog, this.component, this.defaults);
  }

  hostConnected(): void {
    listeners.add(this.notify);
  }

  hostDisconnected(): void {
    listeners.delete(this.notify);
  }
}
