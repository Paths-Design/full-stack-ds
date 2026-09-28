// @generated:start imports
import type { ReactiveControllerHost } from 'lit';
import { ControllableStateController } from '../../primitives/index.js';
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface CarouselBehaviorOptions {
  index?: () => number | undefined;
  defaultIndex?: number;
  onIndexChange?: (value: number) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export class CarouselBehavior {
  readonly slideState: ControllableStateController<number>;

  constructor(host: ReactiveControllerHost, private opts: CarouselBehaviorOptions = {}) {
    this.slideState = new ControllableStateController<number>(host, {
      controlled: opts.index,
      defaultValue: opts.defaultIndex ?? 0,
      onChange: opts.onIndexChange,
    });
  }

  get slide(): number { return this.slideState.value; }
  setSlide(value: number) { this.slideState.set(value); }
}
// @generated:end

// @custom:start trailing

// @custom:end
