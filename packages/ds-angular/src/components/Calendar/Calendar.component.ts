// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";
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
const CalendarMessages = { caption: "Calendar", previousMonth: "Previous month", nextMonth: "Next month", gridLabel: "Calendar" };

@Component({
  selector: "fsds-calendar",
  standalone: true,
  imports: [NgClass, NgFor],
  host: { "data-fsds-component": "calendar" },
  template: `<div [ngClass]="classes()" role="application" data-fsds-box="">
  <div [ngClass]="'calendar__header'">
    <button [ngClass]="'calendar__nav'" [attr.aria-label]="fsdsMessages().previousMonth"></button>
    <span [ngClass]="'calendar__caption'">
      {{ (caption ?? fsdsMessages().caption) }}
    </span>
    <button [ngClass]="'calendar__nav'" [attr.aria-label]="fsdsMessages().nextMonth"></button>
  </div>
  <table [ngClass]="'calendar__grid'" role="grid" [attr.aria-label]="fsdsMessages().gridLabel">
    <tbody>
      <tr>
        <ng-container *ngFor="let item of (days ?? []); let index = index">
          <td [ngClass]="'calendar__cell'" role="gridcell" [attr.data-calendar-index]="index">
            <button [ngClass]="'calendar__day'" (click)="behavior.setValue(item)" tabindex="-1">
              {{ item.getDate() }}
            </button>
          </td>
        </ng-container>
      </tr>
    </tbody>
  </table>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  protected readonly fsdsMessages = injectFsdsMessages("Calendar", CalendarMessages);
  @Input() caption?: string;
  private readonly inputValue = signal<Date | Date[] | null | undefined>(undefined);
  @Input() get value(): Date | Date[] | null | undefined { return this.inputValue(); }
  set value(value: Date | Date[] | null | undefined) { this.inputValue.set(value); }
  @Input() defaultValue?: Date | Date[] | null;
  @Input() onChange?: (value: Date | Date[] | null) => void;
  @Input() mode?: CalendarMode = "single";
  @Input() disabled?: boolean;
  @Input() minDate?: Date;
  @Input() maxDate?: Date;
  @Input() locale?: string = "en-US";
  @Input() shouldCloseOnSelect?: boolean = true;
  @Input() days?: Date[];
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useCalendar>;
  protected get behavior(): ReturnType<typeof useCalendar> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useCalendar({
    value: () => this.value,
    defaultValue: this.defaultValue,
    onChange: (v) => this.onChange?.(v),
    shouldCloseOnSelect: this.shouldCloseOnSelect,
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "calendar",
      (this.mode ?? "single") ? `calendar--${(this.mode ?? "single")}` : null,
      this.disabled ? "calendar--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
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
