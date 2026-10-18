// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass } from "@angular/common";
import { useInput } from "./useInput.js";
import { FieldAssociationService } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-input",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "input" },
  template: `<input [ngClass]="classes()" (input)="handleValueChange($event)" [type]="type" [value]="behavior.value()" [disabled]="disabled" [attr.aria-invalid]="invalid" [placeholder]="placeholder" [name]="name" [required]="required" [attr.aria-label]="ariaLabel" [attr.aria-labelledby]="ariaLabelledby" [attr.id]="fieldAssociation?.current?.controlId" [attr.aria-describedby]="fieldAssociation?.current?.describedBy" data-fsds-box="" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  @Input() type?: string;
  private readonly inputValue = signal<string | undefined>(undefined);
  @Input() get value(): string | undefined { return this.inputValue(); }
  set value(value: string | undefined) { this.inputValue.set(value); }
  @Input() defaultValue?: string;
  @Input() onChange?: (value: string) => void;
  @Input() placeholder?: string;
  @Input() disabled?: boolean;
  @Input() invalid?: boolean;
  @Input() required?: boolean;
  @Input() name?: string;
  @Input() ariaLabel?: string;
  @Input() ariaLabelledby?: string;
  @Input() class?: string;
  protected fieldAssociation = inject(FieldAssociationService, { optional: true });

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useInput>;
  protected get behavior(): ReturnType<typeof useInput> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useInput({
    value: () => this.value,
    defaultValue: this.defaultValue,
    onChange: (v) => this.onChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "input",
      this.disabled ? "input--disabled" : null,
      this.invalid ? "input--invalid" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  protected handleValueChange(event: Event): void {
    this.behavior.setValue((event.target as HTMLInputElement).value);
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
