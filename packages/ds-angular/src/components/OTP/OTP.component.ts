// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";
import { injectFsdsMessages } from "../../primitives/messages.js";
import { StackComponent } from "../../primitives/index.js";
import { useOTP } from "./useOTP.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type OTPMode = "numeric" | "alphanumeric";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
const OTPMessages = { groupLabel: "One-time password", fieldLabel: "One-time password digit" };

@Component({
  selector: "fsds-otp",
  standalone: true,
  imports: [NgClass, NgFor],
  host: { "data-fsds-component": "otp" },
  template: `<div [ngClass]="classes()" role="group" [attr.aria-label]="(label ?? fsdsMessages().groupLabel)" [attr.aria-describedby]="ariaDescribedby" data-fsds-box="">
  <div [ngClass]="'otp__group'">
    <ng-container *ngFor="let _ of arrayFromCount((length ?? 6)); let index = index">
      <input [ngClass]="'otp__field'" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="1" (input)="applySetCharAtValue($event, index)" [disabled]="disabled" [attr.aria-label]="(fieldLabel ?? fsdsMessages().fieldLabel)" [attr.aria-readonly]="readOnly" [attr.data-otp-index]="index" />
    </ng-container>
  </div>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OTPComponent {
  protected readonly fsdsMessages = injectFsdsMessages("OTP", OTPMessages);
  @Input() length?: number = 6;
  private readonly inputValue = signal<string | undefined>(undefined);
  @Input() get value(): string | undefined { return this.inputValue(); }
  set value(value: string | undefined) { this.inputValue.set(value); }
  @Input() defaultValue?: string;
  @Input() onChange?: (value: string) => void;
  @Input() onComplete?: (value: string) => void;
  @Input() mode?: OTPMode = "numeric";
  @Input() disabled?: boolean;
  @Input() readOnly?: boolean;
  @Input() label?: string;
  @Input() fieldLabel?: string;
  @Input() ariaDescribedby?: string;
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useOTP>;
  protected get behavior(): ReturnType<typeof useOTP> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useOTP({
    value: () => this.value,
    defaultValue: this.defaultValue,
    onChange: (v) => this.onChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "otp",
      (this.mode ?? "numeric") ? `otp--${(this.mode ?? "numeric")}` : null,
      this.disabled ? "otp--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  // Materializes an array of length N for *ngFor count-iteration.
  // Memoized by length so re-renders don't churn the iteration source.
  private _arrayFromCountCache = new Map<number, ReadonlyArray<undefined>>();
  protected arrayFromCount(n: number | undefined): ReadonlyArray<undefined> {
    const len = typeof n === "number" && n > 0 ? Math.floor(n) : 0;
    let arr = this._arrayFromCountCache.get(len);
    if (!arr) {
      arr = Array.from({ length: len });
      this._arrayFromCountCache.set(len, arr);
    }
    return arr;
  }

  // Set the character at `index` to the last char of the input payload.
  protected applySetCharAtValue(event: Event, index: number): void {
    this.behavior.setValue(String(this.behavior.value() ?? '').padEnd(index, ' ').slice(0, index) + String((event.target as HTMLInputElement).value ?? '').slice(-1) + String(this.behavior.value() ?? '').slice(index + 1));
  }
}

@Component({
  selector: "fsds-otpgroup",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OTPGroupComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["otp__group", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
