// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass } from "@angular/common";
import { useToggleSwitch } from "./useToggleSwitch.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ToggleSwitchSize = "small" | "medium" | "large";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-toggle-switch",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "toggle-switch" },
  template: `<button [ngClass]="classes()" type="button" (click)="behavior.setChecked(!behavior.checked())" [attr.aria-checked]="behavior.checked()" [attr.aria-label]="ariaLabel" [attr.aria-describedby]="ariaDescribedby" [disabled]="disabled" data-fsds-box="" role="switch"></button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleSwitchComponent {
  private readonly inputChecked = signal<boolean | undefined>(undefined);
  @Input() get checked(): boolean | undefined { return this.inputChecked(); }
  set checked(value: boolean | undefined) { this.inputChecked.set(value); }
  @Input() defaultChecked?: boolean;
  @Input() onChange?: (checked: boolean) => void;
  @Input() size?: ToggleSwitchSize = "medium";
  @Input() disabled?: boolean;
  @Input() ariaLabel?: string;
  @Input() ariaDescribedby?: string;
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useToggleSwitch>;
  protected get behavior(): ReturnType<typeof useToggleSwitch> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useToggleSwitch({
    checked: () => this.checked,
    defaultChecked: this.defaultChecked,
    onChange: (v) => this.onChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "toggle-switch",
      (this.size ?? "medium") ? `toggle-switch--${(this.size ?? "medium")}` : null,
      this.behavior.checked() ? "toggle-switch--checked" : null,
      this.disabled ? "toggle-switch--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
