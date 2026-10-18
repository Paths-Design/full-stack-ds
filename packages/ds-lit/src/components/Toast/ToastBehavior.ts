// @generated:start imports
import type { ReactiveControllerHost } from 'lit';
import { AnchorToggleController } from '../../primitives/index.js';
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface ToastBehaviorOptions {
  open?: () => boolean | undefined;
  onOpenChange?: (value: boolean) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export class ToastBehavior {
  readonly anchorToggle: AnchorToggleController;

  constructor(host: ReactiveControllerHost, private opts: ToastBehaviorOptions = {}) {
    this.anchorToggle = new AnchorToggleController(
      host as ReactiveControllerHost & EventTarget,
      {
        open: opts.open,
        defaultOpen: false,
        onOpenChange: opts.onOpenChange,
      },
    );
  }

  get open(): boolean { return this.anchorToggle.open; }
  setOpen(value: boolean) { this.anchorToggle.setOpen(value); }
}
// @generated:end

// @custom:start trailing

// @custom:end
