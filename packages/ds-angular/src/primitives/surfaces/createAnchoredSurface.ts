import {
  type DestroyRef,
  type Signal,
  computed,
  signal,
} from "@angular/core";
import {
  AnchoredSurfaceController,
  type AnchoredSurfaceControllerOptions,
} from "./AnchoredSurfaceController.js";
import type {
  SurfaceAnchorRelation,
  SurfaceDismissalMode,
  SurfaceOpenTrigger,
} from "./SurfaceController.js";

export interface CreateAnchoredSurfaceOptions {
  /** Getter for the controlled open value (undefined when uncontrolled). */
  open: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openTriggers: () => readonly SurfaceOpenTrigger[];
  dismissal: () => readonly SurfaceDismissalMode[];
  anchorRelation: SurfaceAnchorRelation;
  disabled?: () => boolean;
  idBase?: string;
  /** Component's DestroyRef so we tear down on component destroy. */
  destroyRef: DestroyRef;
}

export interface CreateAnchoredSurfaceResult {
  /** Reactive Signal exposing the current open value. */
  open: Signal<boolean>;
  setOpen: (next: boolean) => void;
  contentId: string;
  anchorRelation: SurfaceAnchorRelation;
  /** Register the anchor element. Used by both the default-host
   *  TooltipTrigger component (passes its rendered <button>) and the
   *  [fsdsTooltipTrigger] directive (passes its host element). */
  registerAnchor: (node: HTMLElement | null) => void;
  /** Register the content host element. */
  registerContent: (node: HTMLElement | null) => void;
  /** Force re-install of listeners. Called by the root when reactive
   *  options (closeOnEscape/closeOnBlur) change. */
  requestRemount: () => void;
  /** Currently registered anchor node, or null before registration.
   *  Consumed by anchored-positioning wiring (createAnchoredPosition). */
  getAnchorNode: () => HTMLElement | null;
  /** Currently registered content node, or null before registration.
   *  Consumed by anchored-positioning wiring (createAnchoredPosition). */
  getContentNode: () => HTMLElement | null;
}

let surfaceIdCounter = 0;

/**
 * Internal substrate factory for anchored surfaces. Owns state +
 * controller + DestroyRef lifecycle. Returns an API surface that
 * the root Tooltip component provides to its children via DI.
 */
export function createAnchoredSurface(
  options: CreateAnchoredSurfaceOptions,
): CreateAnchoredSurfaceResult {
  surfaceIdCounter += 1;
  const contentId = options.idBase ?? `surface-${surfaceIdCounter}`;

  // Seed uncontrolled state directly from defaultOpen; do NOT route
  // through onOpenChange because the consumer didn't trigger this —
  // the initial-mount default did.
  const uncontrolledOpen = signal<boolean>(options.defaultOpen === true);

  const openSignal = computed<boolean>(() => {
    const controlled = options.open();
    return controlled === undefined ? uncontrolledOpen() : controlled;
  });

  const setOpen = (next: boolean): void => {
    if (options.open() === undefined) {
      uncontrolledOpen.set(next);
    }
    options.onOpenChange?.(next);
  };

  const controllerOptions: AnchoredSurfaceControllerOptions = {
    isOpen: () => openSignal(),
    setOpen,
    openTriggers: options.openTriggers(),
    dismissal: options.dismissal,
    disabled: options.disabled,
  };
  const controller = new AnchoredSurfaceController(controllerOptions);
  controller.start();

  options.destroyRef.onDestroy(() => {
    controller.stop();
  });

  const registerAnchor = (node: HTMLElement | null): void => {
    controller.setAnchor(node);
  };
  const registerContent = (node: HTMLElement | null): void => {
    controller.setContent(node);
  };
  const requestRemount = (): void => {
    controller.requestRemount();
  };

  return {
    open: openSignal,
    setOpen,
    contentId,
    anchorRelation: options.anchorRelation,
    registerAnchor,
    registerContent,
    requestRemount,
    getAnchorNode: () => controller.getAnchor(),
    getContentNode: () => controller.getContent(),
  };
}
