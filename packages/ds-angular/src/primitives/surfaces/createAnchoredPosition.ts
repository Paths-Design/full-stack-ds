import { type DestroyRef, type Signal, computed, signal } from "@angular/core";

export type AnchoredPlacement = "top" | "bottom" | "left" | "right";

export type AnchoredCollisionStrategy =
  /** Prefer requested placement; flip to opposite axis on overflow; clamp on cross-axis. */
  | "flip-shift"
  /** Prefer requested placement; clamp on both axes but never flip. */
  | "shift"
  /** Use requested placement as-is, no flipping or clamping. */
  | "none";

export interface CreateAnchoredPositionOptions {
  /** Getter for the anchor / trigger element to position against. */
  anchor: () => HTMLElement | null;
  /** Getter for the content element being positioned. */
  content: () => HTMLElement | null;
  /** Getter for whether the surface is currently open. Position only computes when true. */
  open: () => boolean;
  /**
   * Getter for preferred placement. May be overridden by collision
   * detection depending on `collision`. Defaults to "bottom".
   */
  placement?: () => AnchoredPlacement | "auto";
  /** Getter for the collision strategy. Defaults to "flip-shift". */
  collision?: () => AnchoredCollisionStrategy;
  /** Gap in pixels between anchor and content. Defaults to 8. */
  offset?: number;
  /**
   * Minimum gap to viewport edges when clamping horizontally / vertically
   * via "shift". Defaults to 8.
   */
  viewportPadding?: number;
  /** Component's DestroyRef so listeners tear down on component destroy. */
  destroyRef: DestroyRef;
}

export interface AnchoredPositionState {
  /** Final placement after collision resolution. */
  placement: AnchoredPlacement;
  /** Computed `top` in CSS pixels (for `position: fixed`). */
  top: number;
  /** Computed `left` in CSS pixels (for `position: fixed`). */
  left: number;
  /**
   * `true` once the first measurement has run after open. Consumers use
   * this to avoid flashing the content at (0, 0) before placement is
   * known. Render hidden when `false`.
   */
  ready: boolean;
}

export interface CreateAnchoredPositionResult {
  /** Reactive Signal exposing the current computed position. */
  state: Signal<AnchoredPositionState>;
  /**
   * Force a recompute + node/listener rewire. Called by the host
   * component when the anchor/content nodes are (re)registered or
   * when open transitions, since Angular signals do not auto-track
   * plain-getter option changes the way React's dependency array does.
   */
  requestUpdate: () => void;
}

const HIDDEN_STATE: AnchoredPositionState = {
  placement: "bottom",
  top: 0,
  left: 0,
  ready: false,
};

/**
 * Framework-neutral anchored-surface position computation with
 * flip + clamp collision handling, wired for Angular's signal +
 * DestroyRef idiom (mirrors React's `useAnchoredPosition` exactly in
 * options shape, state shape, and computation semantics — see
 * packages/ds-react/src/primitives/surfaces/useAnchoredPosition.ts).
 *
 * Designed to compose with `createAnchoredSurface`: pass getters for
 * the anchor and content nodes already tracked by the surface
 * substrate, and apply the returned `{ top, left }` to the content
 * node via `position: fixed`.
 *
 * Strategy for "flip-shift" (default):
 *   1. Place content along the requested side of the anchor (vertical
 *      for "top"/"bottom", horizontal for "left"/"right"; "auto"
 *      starts from "bottom").
 *   2. If the placed content overflows on the placement axis, flip to
 *      the opposite side and re-measure.
 *   3. Clamp on the cross axis so the content stays within the
 *      viewport (with `viewportPadding` from each edge).
 *
 * Recomputes on: `requestUpdate()` (called by the host on open change
 * and node registration), content size (ResizeObserver, feature-
 * detected), window resize, and window scroll (capture phase —
 * catches nested scroll containers). Listeners install lazily on
 * first `requestUpdate()` call while open, and tear down via
 * `destroyRef.onDestroy` and whenever the surface closes.
 *
 * Returns `{ ready: false }` until the first measurement completes;
 * consumers should hide content (e.g. `visibility: hidden`) when not
 * ready to avoid a frame at (0, 0).
 */
export function createAnchoredPosition(
  options: CreateAnchoredPositionOptions,
): CreateAnchoredPositionResult {
  const {
    anchor,
    content,
    open,
    placement = () => "auto" as const,
    collision = () => "flip-shift" as const,
    offset = 8,
    viewportPadding = 8,
    destroyRef,
  } = options;

  const stateSignal = signal<AnchoredPositionState>(HIDDEN_STATE);

  let cleanupListeners: (() => void) | null = null;

  const compute = (): void => {
    const anchorEl = anchor();
    const contentEl = content();
    if (!open() || !anchorEl || !contentEl) return;
    const next = computePosition({
      anchor: anchorEl,
      content: contentEl,
      placement: placement(),
      collision: collision(),
      offset,
      viewportPadding,
    });
    const prev = stateSignal();
    // Avoid spurious signal writes when the computed values match.
    if (
      prev.ready &&
      prev.placement === next.placement &&
      prev.top === next.top &&
      prev.left === next.left
    ) {
      return;
    }
    stateSignal.set(next);
  };

  const installListeners = (contentEl: HTMLElement, anchorEl: HTMLElement): void => {
    // Feature-detect ResizeObserver. jsdom and a handful of older
    // environments don't ship it; in those cases we fall back to just
    // window resize + scroll, which is enough to keep the surface
    // anchored if the trigger position changes via layout.
    const RO: typeof ResizeObserver | undefined =
      typeof ResizeObserver !== "undefined" ? ResizeObserver : undefined;
    const ro = RO ? new RO(() => compute()) : null;
    ro?.observe(contentEl);
    ro?.observe(anchorEl);

    // Listen with capture so we catch nested scrollables, not just the
    // window. Anchor + content can both move when an intermediate scroll
    // container scrolls.
    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    cleanupListeners = () => {
      ro?.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  };

  const requestUpdate = (): void => {
    const anchorEl = anchor();
    const contentEl = content();
    if (!open() || !anchorEl || !contentEl) {
      cleanupListeners?.();
      cleanupListeners = null;
      if (stateSignal().ready) stateSignal.set(HIDDEN_STATE);
      return;
    }

    compute();

    // (Re)install listeners keyed on node identity: tear down any
    // prior wiring before attaching to the (possibly new) nodes.
    cleanupListeners?.();
    cleanupListeners = null;
    installListeners(contentEl, anchorEl);
  };

  destroyRef.onDestroy(() => {
    cleanupListeners?.();
    cleanupListeners = null;
  });

  return {
    state: computed(() => stateSignal()),
    requestUpdate,
  };
}

interface ComputeArgs {
  anchor: HTMLElement;
  content: HTMLElement;
  placement: AnchoredPlacement | "auto";
  collision: AnchoredCollisionStrategy;
  offset: number;
  viewportPadding: number;
}

function computePosition(args: ComputeArgs): AnchoredPositionState {
  const { anchor, content, collision, offset, viewportPadding } = args;
  const anchorRect = anchor.getBoundingClientRect();
  // Entrance scale changes the painted rect but not the resting layout box.
  // Clamp against the resting size so the surface stays inside the viewport
  // after its animation ends (ResizeObserver does not observe transforms).
  const paintedRect = content.getBoundingClientRect();
  const contentRect = {
    ...paintedRect,
    width: content.offsetWidth || paintedRect.width,
    height: content.offsetHeight || paintedRect.height,
  } as DOMRect;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Normalize "auto" → "bottom" as the seed placement. The flip step
  // below handles the case where bottom doesn't fit.
  const seedPlacement: AnchoredPlacement =
    args.placement === "auto" ? "bottom" : args.placement;

  let placement = seedPlacement;
  let { top, left } = placeAlong(placement, anchorRect, contentRect, offset);

  // Flip phase. Only flip along the placement axis (top↔bottom or left↔right).
  if (collision === "flip-shift") {
    const overflows = measureOverflow(top, left, contentRect, viewportWidth, viewportHeight);
    if (placement === "bottom" && overflows.bottom > 0 && overflows.bottom > overflows.top) {
      placement = "top";
      ({ top, left } = placeAlong(placement, anchorRect, contentRect, offset));
    } else if (placement === "top" && overflows.top > 0 && overflows.top > overflows.bottom) {
      placement = "bottom";
      ({ top, left } = placeAlong(placement, anchorRect, contentRect, offset));
    } else if (placement === "right" && overflows.right > 0 && overflows.right > overflows.left) {
      placement = "left";
      ({ top, left } = placeAlong(placement, anchorRect, contentRect, offset));
    } else if (placement === "left" && overflows.left > 0 && overflows.left > overflows.right) {
      placement = "right";
      ({ top, left } = placeAlong(placement, anchorRect, contentRect, offset));
    }
  }

  // Shift / clamp phase. Applies for both "flip-shift" and "shift".
  if (collision !== "none") {
    const maxLeft = viewportWidth - contentRect.width - viewportPadding;
    const maxTop = viewportHeight - contentRect.height - viewportPadding;
    if (left > maxLeft) left = maxLeft;
    if (left < viewportPadding) left = viewportPadding;
    if (top > maxTop) top = maxTop;
    if (top < viewportPadding) top = viewportPadding;
  }

  return { placement, top, left, ready: true };
}

interface Overflow {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

function measureOverflow(
  top: number,
  left: number,
  content: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
): Overflow {
  return {
    top: Math.max(0, -top),
    bottom: Math.max(0, top + content.height - viewportHeight),
    left: Math.max(0, -left),
    right: Math.max(0, left + content.width - viewportWidth),
  };
}

interface PlacedRect {
  top: number;
  left: number;
}

function placeAlong(
  placement: AnchoredPlacement,
  anchor: DOMRect,
  content: DOMRect,
  offset: number,
): PlacedRect {
  switch (placement) {
    case "top":
      return {
        top: anchor.top - content.height - offset,
        left: anchor.left + (anchor.width - content.width) / 2,
      };
    case "bottom":
      return {
        top: anchor.bottom + offset,
        left: anchor.left + (anchor.width - content.width) / 2,
      };
    case "left":
      return {
        top: anchor.top + (anchor.height - content.height) / 2,
        left: anchor.left - content.width - offset,
      };
    case "right":
      return {
        top: anchor.top + (anchor.height - content.height) / 2,
        left: anchor.right + offset,
      };
  }
}
