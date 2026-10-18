import { computed, signal } from "@angular/core";
import { createDateGrid, type DateGridOptions } from "./date/date-grid.js";

/**
 * Angular binding for the date-grid core: the grid is a computed over the
 * options (read from signal-backed inputs and channel signals) and the
 * core's focus version. The component calls `afterRender` from
 * `ngAfterViewChecked` so focus follows a keyboard move.
 */
export function createReactiveDateGrid(options: () => DateGridOptions) {
  const dateGrid = createDateGrid();
  const version = signal(0);
  const unsubscribe = dateGrid.subscribe(() => version.set(dateGrid.version));
  const state = computed(() => {
    version();
    return dateGrid.sync(options());
  });
  return {
    get state() { return state(); },
    previous: dateGrid.previous,
    next: dateGrid.next,
    select: dateGrid.select,
    keydown: dateGrid.keydown,
    afterRender: dateGrid.afterRender,
    destroy: unsubscribe,
  };
}
