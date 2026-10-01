import type { ReactiveController, ReactiveControllerHost } from "lit";
import { createPagedSet, type PagedSetOptions } from "../paging.js";
export class PagedSetController implements ReactiveController {
  private pagedSet = createPagedSet();
  private unsubscribe?: () => void;
  constructor(private host: ReactiveControllerHost, private options: () => PagedSetOptions) { host.addController(this); }
  hostConnected() { this.unsubscribe = this.pagedSet.subscribe(() => this.host.requestUpdate()); }
  hostUpdated() { this.pagedSet.sync(this.options()); }
  hostDisconnected() { this.unsubscribe?.(); }
  get state() { return this.pagedSet.state; }
  request = (index: number) => this.pagedSet.request(index);
  previous = () => this.pagedSet.previous();
  next = () => this.pagedSet.next();
  edit = (value: string) => this.pagedSet.edit(value);
  commit = () => this.pagedSet.commit();
  commitOnEnter = (event: { key: string; preventDefault(): void }) => this.pagedSet.commitOnEnter(event);
  cancel = () => this.pagedSet.cancel();
}
