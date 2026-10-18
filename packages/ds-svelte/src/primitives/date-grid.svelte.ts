import { createDateGrid, type DateGridOptions } from "./date/date-grid.js";

/**
 * Svelte binding for the date-grid core: the grid is derived from the
 * options and the core's focus version, and focus follows a keyboard move
 * or a selection in an effect, which runs after the DOM reflects it.
 */
export function createReactiveDateGrid(options: () => DateGridOptions) {
  const dateGrid = createDateGrid();
  let version = $state(0);
  const unsubscribe = dateGrid.subscribe(() => { version = dateGrid.version; });
  const state = $derived.by(() => {
    void version;
    return dateGrid.sync(options());
  });
  $effect(() => {
    void state;
    dateGrid.afterRender();
  });
  $effect(() => unsubscribe);
  return {
    get state() { return state; },
    previous: dateGrid.previous,
    next: dateGrid.next,
    select: dateGrid.select,
    keydown: dateGrid.keydown,
  };
}
