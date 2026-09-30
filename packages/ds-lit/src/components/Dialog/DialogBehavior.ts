// @generated:start imports
import type { ReactiveControllerHost } from 'lit';
import { ControllableStateController, DismissalController, FocusTrapController, ScrollLockController } from '../../primitives/index.js';
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface DialogBehaviorOptions {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (value: boolean) => void;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  containerEl?: HTMLElement;
  initialFocus?: () => string | undefined;
  returnFocus?: () => string | undefined;
  /** When false the surface is non-blocking: no focus trap, no scroll lock. */
  modal?: () => boolean | undefined;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export class DialogBehavior {
  readonly opennessState: ControllableStateController<boolean>;
  readonly focusTrap: FocusTrapController;
  readonly scrollLock: ScrollLockController;
  readonly dismissal: DismissalController;

  constructor(host: ReactiveControllerHost, private opts: DialogBehaviorOptions = {}) {
    this.opennessState = new ControllableStateController<boolean>(host, {
      controlled: opts.open,
      defaultValue: opts.defaultOpen ?? false,
      onChange: opts.onOpenChange,
    });
    this.focusTrap = new FocusTrapController(host, {
      getActive: () => this.opennessState.value && (opts.modal?.() ?? true),
      getContainer: () => opts.containerEl ?? null,
      getInitialFocus: opts.initialFocus,
      getReturnFocus: opts.returnFocus,
    });
    this.scrollLock = new ScrollLockController(host, {
      getActive: () => this.opennessState.value && (opts.modal?.() ?? true),
    });
    this.dismissal = new DismissalController(host, {
      open: () => this.opennessState.value,
      closeOnEscape: () => opts.closeOnEscape,
      onDismiss: () => { this.opennessState.set(false); },
    });
  }

  get openness(): boolean { return this.opennessState.value; }
  setOpenness(value: boolean) { this.opennessState.set(value); }
}
// @generated:end

// @custom:start trailing

// @custom:end
