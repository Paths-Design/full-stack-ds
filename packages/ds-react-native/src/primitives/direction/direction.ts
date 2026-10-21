/**
 * Inline direction of a rendered element, shared by every keyboard binding
 * whose arrow keys follow the layout (the date grid, a horizontal tab list).
 * Copied byte-identical into each framework package's primitives, like the
 * date-grid core that imports it.
 */

/**
 * Whether `target` sits in right-to-left text: the nearest `dir` attribute on
 * the composed ancestor chain. The walk crosses shadow roots to their hosts,
 * because a page sets `dir` outside a web component's shadow tree. A target
 * with no DOM ancestry (React Native) reads as left-to-right.
 */
export function isRtl(target: EventTarget | null): boolean {
  let element = target as Element | null;
  while (element) {
    const holder = element.closest?.("[dir]");
    if (holder) return holder.getAttribute("dir") === "rtl";
    const root = element.getRootNode?.() as ShadowRoot | Document | undefined;
    element = root && "host" in root ? root.host : null;
  }
  return false;
}
