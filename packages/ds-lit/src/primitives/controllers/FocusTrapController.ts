import type { ReactiveControllerHost } from 'lit';
import { createFocusTrapLifecycle, type FocusTrapLifecycleOptions } from '../focus-trap.js';

export type FocusTrapOptions = FocusTrapLifecycleOptions;

/** Reconcile the shadow-root panel after each host render and on reconnect. */
export class FocusTrapController {
  private lifecycle: ReturnType<typeof createFocusTrapLifecycle>;

  constructor(host: ReactiveControllerHost, opts: FocusTrapOptions) {
    this.lifecycle = createFocusTrapLifecycle(opts);
    host.addController(this);
  }

  hostConnected() { this.lifecycle.update(); }
  hostUpdated() { this.lifecycle.update(); }
  hostDisconnected() { this.lifecycle.dispose(); }
}
