import { useEffect, useRef, useSyncExternalStore } from "react";
import { createDateGrid, type DateGridOptions } from "../date/date-grid.js";

/**
 * React binding for the date-grid core: derives the grid on every render,
 * re-renders when the focused day moves, and lets focus follow a keyboard
 * move once the moved-to day is in the DOM.
 */
export function useDateGrid(options: DateGridOptions) {
  const controller = useRef<ReturnType<typeof createDateGrid> | null>(null);
  if (!controller.current) controller.current = createDateGrid();
  const dateGrid = controller.current;
  useSyncExternalStore(dateGrid.subscribe, () => dateGrid.version, () => dateGrid.version);
  dateGrid.sync(options);
  useEffect(() => { dateGrid.afterRender(); });
  return dateGrid;
}
