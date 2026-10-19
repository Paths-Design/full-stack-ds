import { computed, onBeforeUnmount, onUpdated, shallowRef } from "vue";
import { createDateGrid, type DateGridOptions } from "../date/date-grid.js";

/**
 * Vue binding for the date-grid core: the grid is a computed over the
 * options and the core's focus version, and focus follows a keyboard move
 * or a selection once the component has re-rendered.
 */
export function useDateGrid(options: () => DateGridOptions) {
  const dateGrid = createDateGrid();
  const version = shallowRef(0);
  const unsubscribe = dateGrid.subscribe(() => { version.value = dateGrid.version; });
  const state = computed(() => {
    void version.value;
    return dateGrid.sync(options());
  });
  onUpdated(() => dateGrid.afterRender());
  onBeforeUnmount(unsubscribe);
  return {
    get state() { return state.value; },
    previous: dateGrid.previous,
    next: dateGrid.next,
    select: dateGrid.select,
    keydown: dateGrid.keydown,
  };
}
