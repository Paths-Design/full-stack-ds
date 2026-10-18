// @generated:start imports
import type { ReactiveControllerHost } from 'lit';
import { ControllableStateController, DismissalController } from '../../primitives/index.js';
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface CalendarBehaviorOptions {
  value?: () => Date | Date[] | null | undefined;
  defaultValue?: Date | Date[] | null;
  onChange?: (value: Date | Date[] | null) => void;
  month?: () => Date | undefined;
  defaultMonth?: Date;
  onMonthChange?: (value: Date) => void;
  shouldCloseOnSelect?: boolean;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export class CalendarBehavior {
  readonly valueState: ControllableStateController<Date | Date[] | null>;
  readonly monthState: ControllableStateController<Date>;
  readonly dismissal: DismissalController;

  constructor(host: ReactiveControllerHost, private opts: CalendarBehaviorOptions = {}) {
    this.valueState = new ControllableStateController<Date | Date[] | null>(host, {
      controlled: opts.value,
      defaultValue: opts.defaultValue ?? undefined as never,
      onChange: opts.onChange,
    });
    this.monthState = new ControllableStateController<Date>(host, {
      controlled: opts.month,
      defaultValue: opts.defaultMonth ?? undefined as never,
      onChange: opts.onMonthChange,
    });
    this.dismissal = new DismissalController(host, {
      open: () => true,
      closeOnEscape: () => true,
      onDismiss: () => { void 0; },
    });
  }

  get value(): Date | Date[] | null { return this.valueState.value; }
  setValue(value: Date | Date[] | null) { this.valueState.set(value); }

  get month(): Date { return this.monthState.value; }
  setMonth(value: Date) { this.monthState.set(value); }
}
// @generated:end

// @custom:start trailing

// @custom:end
