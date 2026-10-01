// @generated:start imports
import type { ReactiveControllerHost } from 'lit';
import { ControllableStateController } from '../../primitives/index.js';
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface PaginationBehaviorOptions {
  index?: () => number | undefined;
  defaultIndex?: number;
  onIndexChange?: (value: number) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export class PaginationBehavior {
  readonly pageState: ControllableStateController<number>;

  constructor(host: ReactiveControllerHost, private opts: PaginationBehaviorOptions = {}) {
    this.pageState = new ControllableStateController<number>(host, {
      controlled: opts.index,
      defaultValue: opts.defaultIndex ?? 0,
      onChange: opts.onIndexChange,
    });
  }

  get page(): number { return this.pageState.value; }
  setPage(value: number) { this.pageState.set(value); }
}
// @generated:end

// @custom:start trailing

// @custom:end
