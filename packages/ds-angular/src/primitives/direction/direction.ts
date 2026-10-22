/**
 * Inline direction of a rendered element, shared by every keyboard binding
 * whose arrow keys follow the layout (the date grid, a horizontal tab list).
 * Copied byte-identical into each framework package's primitives, like the
 * date-grid core that imports it.
 */

/**
 * Whether `target` sits in right-to-left text, using the live computed
 * direction so CSS, inherited direction and dir=auto agree with rendering.
 * DOM emulators without a computed direction fall back to valid dir keywords
 * along the composed ancestor chain. Non-DOM targets read as left-to-right.
 */
export function isRtl(target: EventTarget | null): boolean {
  let element = target as Element | null;
  const view = element?.ownerDocument?.defaultView;
  if (view && element?.nodeType === 1) {
    const direction = view.getComputedStyle(element).direction;
    if (direction === "rtl" || direction === "ltr") return direction === "rtl";
  }
  while (element) {
    const holder = element.closest?.("[dir]");
    if (holder) {
      const direction = holder.getAttribute("dir")?.toLowerCase();
      if (direction === "rtl" || direction === "ltr") return direction === "rtl";
      // Invalid and automatic values do not themselves declare a fallback.
      // Inspect higher ancestors, including a shadow host when appropriate.
      element = holder;
      if (holder.parentElement) {
        element = holder.parentElement;
        continue;
      }
    }
    const root = element.getRootNode?.() as ShadowRoot | Document | undefined;
    element = root && "host" in root ? root.host : null;
  }
  return false;
}
