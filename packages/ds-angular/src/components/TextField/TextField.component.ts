// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
import { useTextField } from "./useTextField.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
let nextInstanceId = 0;

@Component({
  selector: "fsds-text-field",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "text-field" },
  template: `<div [ngClass]="classes()" data-fsds-box="">
  <label [ngClass]="'text-field__label'" [attr.id]="instanceId + '-label'">
    <ng-content select="[slot=label]" />
  </label>
  <input [ngClass]="'text-field__field'" (input)="handleValueChange($event)" [type]="type" [value]="behavior.value()" [disabled]="disabled" [name]="name" [required]="required" [attr.aria-invalid]="invalid" [attr.aria-labelledby]="instanceId + '-label'" [attr.aria-describedby]="fieldAriaDescribedby" />
  <span [ngClass]="'text-field__description'" [attr.id]="instanceId + '-description'">
    <ng-content select="[slot=description]" />
  </span>
  <span [ngClass]="'text-field__error'" role="alert" [attr.id]="instanceId + '-error'">
    <ng-content select="[slot=error]" />
  </span>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextFieldComponent {
  @Input() type?: string;
  private readonly inputValue = signal<string | undefined>(undefined);
  @Input() get value(): string | undefined { return this.inputValue(); }
  set value(value: string | undefined) { this.inputValue.set(value); }
  @Input() defaultValue?: string;
  @Input() onChange?: (value: string) => void;
  @Input() invalid?: boolean;
  @Input() disabled?: boolean;
  @Input() required?: boolean;
  @Input() name?: string;
  @Input() ariaDescribedby?: string;
  @Input() class?: string;

  protected readonly instanceId = `fsds-text-field-${nextInstanceId++}`;

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useTextField>;
  protected get behavior(): ReturnType<typeof useTextField> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useTextField({
    value: () => this.value,
    defaultValue: this.defaultValue,
    onChange: (v) => this.onChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "text-field",
      this.invalid ? "text-field--invalid" : null,
      this.disabled ? "text-field--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  get fieldAriaDescribedby(): string | undefined {
    return [`${this.instanceId}-description`, this.invalid ? `${this.instanceId}-error` : null, this.ariaDescribedby].filter(Boolean).join(" ") || undefined;
  }

  protected handleValueChange(event: Event): void {
    this.behavior.setValue((event.target as HTMLInputElement).value);
  }
}

@Component({
  selector: "fsds-text-field-description",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="p" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextFieldDescriptionComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["text-field__description", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
