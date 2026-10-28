// Node 25 defines its own `localStorage` and `sessionStorage` globals. Vitest's
// jsdom environment copies a window key onto the global only when the global
// lacks it or the key is on vitest's fixed list, which omits both storage keys.
// On Node 25 the tests would therefore read Node's storage, which has no
// Storage methods unless Node is given --localstorage-file. Rebinding both keys
// to the document window's Storage gives every Node version the browser surface
// the showcase persists preferences through. The existing accessors are
// replaced without being read, so Node's storage getter never runs.
const STORAGE_KEYS = ["localStorage", "sessionStorage"] as const;

export function adoptDocumentStorage(
  target: object,
  documentWindow: Pick<Window, (typeof STORAGE_KEYS)[number]>,
): void {
  for (const key of STORAGE_KEYS) {
    Object.defineProperty(target, key, {
      value: documentWindow[key],
      configurable: true,
      enumerable: true,
      writable: true,
    });
  }
}
