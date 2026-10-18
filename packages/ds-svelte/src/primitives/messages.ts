import { getContext, setContext } from "svelte";
import { mergeFsdsMessageCatalogs, resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

export { formatFsdsMessage, mergeFsdsMessageCatalogs, resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

const FSDS_MESSAGES = Symbol("fsds-messages");
type CatalogGetter = () => FsdsMessageCatalog | undefined;

/**
 * Provide translated component text to descendants. Pass a getter over
 * reactive state (`() => catalog`) so a locale switch re-renders consumers.
 * Nested providers compose: the inner catalog wins per component and key.
 * Call during component initialisation, like any Svelte context.
 */
export function setFsdsMessages(messages: () => FsdsMessageCatalog): void {
  const outer = getContext<CatalogGetter | undefined>(FSDS_MESSAGES);
  setContext<CatalogGetter>(FSDS_MESSAGES, () => mergeFsdsMessageCatalogs(outer?.(), messages()));
}

/**
 * A component's resolved messages: provided entries over contract defaults.
 * `current` re-reads the context getter, so reads inside `$derived`, effects
 * or markup track catalog changes.
 */
export function useFsdsMessages<T extends Record<string, string>>(component: string, defaults: T): { readonly current: T } {
  const catalog = getContext<CatalogGetter | undefined>(FSDS_MESSAGES);
  return {
    get current() {
      return resolveFsdsMessages(catalog?.(), component, defaults);
    },
  };
}
