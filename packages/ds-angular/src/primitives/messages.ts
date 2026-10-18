import { InjectionToken, computed, inject, isSignal, signal, type Provider, type Signal } from "@angular/core";
import { mergeFsdsMessageCatalogs, resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

export { formatFsdsMessage, mergeFsdsMessageCatalogs, resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

/** DI token for the resolved catalog visible at an injector. */
export const FSDS_MESSAGES = new InjectionToken<Signal<FsdsMessageCatalog>>("FSDS_MESSAGES");

/**
 * Provide translated component text, at bootstrap (`providers: [...]`) or on
 * any component/route injector. Pass a signal to switch locale at runtime.
 * Nested providers compose: the inner catalog wins per component and key.
 */
export function provideFsdsMessages(messages: FsdsMessageCatalog | Signal<FsdsMessageCatalog>): Provider {
  return {
    provide: FSDS_MESSAGES,
    useFactory: () => {
      const outer = inject(FSDS_MESSAGES, { optional: true, skipSelf: true });
      const own = isSignal(messages) ? messages : signal(messages).asReadonly();
      return computed(() => mergeFsdsMessageCatalogs(outer?.(), own()));
    },
  };
}

/**
 * A component's resolved messages: provided entries over contract defaults.
 * Call in an injection context (a field initializer of a component).
 */
export function injectFsdsMessages<T extends Record<string, string>>(component: string, defaults: T): Signal<T> {
  const catalog = inject(FSDS_MESSAGES, { optional: true });
  return computed(() => resolveFsdsMessages(catalog?.(), component, defaults));
}
