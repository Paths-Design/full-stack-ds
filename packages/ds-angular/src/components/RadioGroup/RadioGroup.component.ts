// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";
import { useRadioGroup } from "./useRadioGroup.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type RadioGroupOption = { value: string; label: string; disabled?: boolean; description?: string };
export type RadioGroupOrientation = "vertical" | "horizontal";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-radio-group",
  standalone: true,
  imports: [NgClass, NgFor],
  host: { "data-fsds-component": "radio-group" },
  template: `<fieldset [ngClass]="classes()" role="radiogroup" [attr.aria-label]="ariaLabel" data-fsds-box="">
  <ng-container *ngFor="let item of ((options ?? [{'value':'alpha','label':'Alpha'},{'value':'beta','label':'Beta'}])); let index = index; trackBy: trackByIndex">
    <label [ngClass]="'radio-group__item'" [attr.data-checked]="(item.value === behavior.selection())" [attr.data-disabled]="item.disabled" [title]="item.description">
      <input [ngClass]="'radio-group__option'" type="radio" (change)="behavior.setSelection(item.value)" [name]="name" [value]="item.value" [checked]="(item.value === behavior.selection())" [disabled]="item.disabled" [attr.aria-label]="item.label" [attr.aria-checked]="(item.value === behavior.selection())" />
      <span [ngClass]="'radio-group__label'">
        {{ item.label }}
      </span>
    </label>
  </ng-container>
</fieldset>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioGroupComponent {
  @Input() options: RadioGroupOption[] = [{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"}];
  @Input() name!: string;
  private readonly inputValue = signal<string | undefined>(undefined);
  @Input() get value(): string | undefined { return this.inputValue(); }
  set value(value: string | undefined) { this.inputValue.set(value); }
  @Input() defaultValue?: string;
  @Input() onChange?: (value: string) => void;
  @Input() ariaLabel?: string;
  @Input() orientation?: RadioGroupOrientation = "vertical";
  @Input() class?: string;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useRadioGroup>;
  protected get behavior(): ReturnType<typeof useRadioGroup> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useRadioGroup({
    value: () => this.value,
    defaultValue: this.defaultValue,
    onChange: (v) => this.onChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "radio-group",
      (this.orientation ?? "vertical") ? `radio-group--${(this.orientation ?? "vertical")}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  protected readonly trackByIndex = (index: number): number => index;
}
// @generated:end

// @custom:start trailing

// @custom:end
