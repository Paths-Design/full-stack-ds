import type { ReactiveController, ReactiveControllerHost } from "lit";
import { createSequenceBudget, type SequenceConfig, type SequenceOptions } from "../sequence-budget.js";
export class SequenceController implements ReactiveController {
  private sequence: ReturnType<typeof createSequenceBudget>;
  constructor(host: ReactiveControllerHost, config: SequenceConfig, private options: () => SequenceOptions) {
    this.sequence = createSequenceBudget(config);
    host.addController(this);
  }
  hostUpdated() { this.sequence.sync(this.options()); }
  hostDisconnected() { this.sequence.destroy(); }
  bindRoot = (element: Element | undefined) => this.sequence.bindRoot(element);
}
