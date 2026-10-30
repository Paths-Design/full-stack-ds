// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";
import { createReactiveDateGrid } from "../../primitives/date-grid-signal.js";
import { injectFsdsMessages } from "../../primitives/messages.js";
import { StackComponent } from "../../primitives/index.js";
import { useCalendar } from "./useCalendar.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CalendarMode = "single" | "range";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
const CalendarMessages = { previousMonth: "Previous month", nextMonth: "Next month" };

@Component({
  selector: "fsds-calendar",
  standalone: true,
  imports: [NgClass, NgFor],
  host: { "data-fsds-component": "calendar" },
  template: `<div [ngClass]="classes()" role="group" [attr.aria-label]="ariaLabel" [attr.aria-labelledby]="ariaLabelledby" data-fsds-box="">
  <div [ngClass]="'calendar__header'">
    <button [ngClass]="'calendar__nav'" type="button" data-calendar-nav="previous" (click)="dateGrid.previous()" [attr.aria-label]="fsdsMessages().previousMonth" [attr.aria-disabled]="dateGrid.state.previousDisabled">
      <span aria-hidden="true">
        {{ '‹' }}
      </span>
    </button>
    <span [ngClass]="'calendar__caption'" aria-live="polite">
      {{ dateGrid.state.caption }}
    </span>
    <button [ngClass]="'calendar__nav'" type="button" data-calendar-nav="next" (click)="dateGrid.next()" [attr.aria-label]="fsdsMessages().nextMonth" [attr.aria-disabled]="dateGrid.state.nextDisabled">
      <span aria-hidden="true">
        {{ '›' }}
      </span>
    </button>
  </div>
  <table [ngClass]="'calendar__grid'" role="grid" (keydown)="dateGrid.keydown($event)" [attr.aria-label]="dateGrid.state.caption" [attr.aria-multiselectable]="dateGrid.state.multiselectable">
    <thead>
      <tr role="row">
        <ng-container *ngFor="let item of (dateGrid.state.weekdays ?? []); let index = index; trackBy: trackByIndex">
          <th [ngClass]="'calendar__weekday'" role="columnheader" scope="col" [attr.aria-label]="item.long">
            <span>
              {{ item.short }}
            </span>
          </th>
        </ng-container>
      </tr>
    </thead>
    <tbody>
      <ng-container *ngFor="let week of (dateGrid.state.weeks ?? []); let row = index; trackBy: trackByIndex">
        <tr role="row">
          <ng-container *ngFor="let day of (week.days ?? []); let column = index; trackBy: trackByIndex">
            <td [ngClass]="'calendar__day'" role="gridcell" (click)="dateGrid.select(day)" [tabindex]="day.tabIndex" [attr.aria-label]="day.fullLabel" [attr.aria-selected]="day.selected" [attr.aria-current]="day.current" [attr.aria-disabled]="day.disabled" [attr.data-date]="day.key" [attr.data-outside-month]="day.outsideMonth">
              <span>
                {{ day.label }}
              </span>
            </td>
          </ng-container>
        </tr>
      </ng-container>
    </tbody>
  </table>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  protected readonly fsdsMessages = injectFsdsMessages("Calendar", CalendarMessages);
  private readonly inputCaption = signal<string | undefined>(undefined);
  @Input() get caption(): string | undefined { return this.inputCaption(); }
  set caption(value: string | undefined) { this.inputCaption.set(value); }
  @Input() ariaLabel?: string;
  @Input() ariaLabelledby?: string;
  private readonly inputMonth = signal<Date | undefined>(undefined);
  @Input() get month(): Date | undefined { return this.inputMonth(); }
  set month(value: Date | undefined) { this.inputMonth.set(value); }
  @Input() defaultMonth?: Date;
  @Input() onMonthChange?: (month: Date) => void;
  private readonly inputValue = signal<Date | Date[] | null | undefined>(undefined);
  @Input() get value(): Date | Date[] | null | undefined { return this.inputValue(); }
  set value(value: Date | Date[] | null | undefined) { this.inputValue.set(value); }
  @Input() defaultValue?: Date | Date[] | null;
  @Input() onChange?: (value: Date | Date[] | null) => void;
  private readonly inputMode = signal<CalendarMode | undefined>(undefined);
  @Input() get mode(): CalendarMode | undefined { return this.inputMode() ?? "single"; }
  set mode(value: CalendarMode | undefined) { this.inputMode.set(value); }
  private readonly inputDisabled = signal<boolean | undefined>(undefined);
  @Input() get disabled(): boolean | undefined { return this.inputDisabled(); }
  set disabled(value: boolean | undefined) { this.inputDisabled.set(value); }
  private readonly inputMinDate = signal<Date | undefined>(undefined);
  @Input() get minDate(): Date | undefined { return this.inputMinDate(); }
  set minDate(value: Date | undefined) { this.inputMinDate.set(value); }
  private readonly inputMaxDate = signal<Date | undefined>(undefined);
  @Input() get maxDate(): Date | undefined { return this.inputMaxDate(); }
  set maxDate(value: Date | undefined) { this.inputMaxDate.set(value); }
  private readonly inputLocale = signal<string | undefined>(undefined);
  @Input() get locale(): string | undefined { return this.inputLocale() ?? "en-US"; }
  set locale(value: string | undefined) { this.inputLocale.set(value); }
  @Input() shouldCloseOnSelect?: boolean = true;
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useCalendar>;
  protected get behavior(): ReturnType<typeof useCalendar> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useCalendar({
    value: () => this.value,
    defaultValue: this.defaultValue,
    onChange: (v) => this.onChange?.(v),
    month: () => this.month,
    defaultMonth: this.defaultMonth,
    onMonthChange: (v) => this.onMonthChange?.(v),
    shouldCloseOnSelect: this.shouldCloseOnSelect,
    destroyRef: this.destroyRef,
  })));
  }
  protected dateGrid = createReactiveDateGrid(() => ({ value: this.behavior.value(), month: this.behavior.month(), mode: this.mode, locale: this.locale, minDate: this.minDate, maxDate: this.maxDate, disabled: this.disabled, caption: this.caption, onValueChange: (next) => this.behavior.setValue(next), onMonthChange: (next) => this.behavior.setMonth(next) }));
  private dateGridCleanup = this.destroyRef.onDestroy(() => this.dateGrid.destroy());
  ngAfterViewChecked(): void { this.dateGrid.afterRender(); }

  classes(): string {
    return [
      "calendar",
      (this.mode ?? "single") ? `calendar--${(this.mode ?? "single")}` : null,
      this.disabled ? "calendar--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  protected readonly trackByIndex = (index: number): number => index;
}

@Component({
  selector: "fsds-calendar-header",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarHeaderComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["calendar__header", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
