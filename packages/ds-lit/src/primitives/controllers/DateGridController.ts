import type { ReactiveController, ReactiveControllerHost } from "lit";
import { createDateGrid, type DateGridDay, type DateGridKeyEvent, type DateGridOptions } from "../date/date-grid.js";

/**
 * Lit binding for the date-grid core: derives the grid before each render,
 * requests an update when the focused day moves, and lets focus follow a
 * keyboard move or a selection once the update has rendered.
 */
export class DateGridController implements ReactiveController {
  private dateGrid = createDateGrid();
  private unsubscribe?: () => void;
  constructor(private host: ReactiveControllerHost, private options: () => DateGridOptions) { host.addController(this); }
  hostConnected() { this.unsubscribe = this.dateGrid.subscribe(() => this.host.requestUpdate()); }
  hostUpdate() { this.dateGrid.sync(this.options()); }
  hostUpdated() { this.dateGrid.afterRender(); }
  hostDisconnected() { this.unsubscribe?.(); }
  get state() { return this.dateGrid.state; }
  previous = () => this.dateGrid.previous();
  next = () => this.dateGrid.next();
  select = (day: DateGridDay) => this.dateGrid.select(day);
  keydown = (event: DateGridKeyEvent) => this.dateGrid.keydown(event);
}
