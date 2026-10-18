// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
import { useField } from "./useField.js";
import { FieldAssociationService } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type FieldStatus = "idle" | "validating" | "valid" | "invalid";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
let nextInstanceId = 0;

@Component({
  selector: "fsds-field",
  standalone: true,
  imports: [NgClass, NgIf],
  providers: [FieldAssociationService],
  host: { "data-fsds-component": "field" },
  template: `<div [ngClass]="classes()" [attr.aria-labelledby]="instanceId + '-label'" data-fsds-box="" role="group">
  <div [ngClass]="'field__header'">
    <label [ngClass]="'field__label'" [attr.id]="instanceId + '-label'" [attr.for]="instanceId + '-control'">
      <ng-content select="[slot=label]" />
    </label>
  </div>
  <div [ngClass]="'field__control'">
    <ng-content select="[slot=control]" />
  </div>
  <div [ngClass]="'field__meta'">
    <span [ngClass]="'field__help'" [attr.id]="instanceId + '-help'">
      <ng-content select="[slot=help]" />
    </span>
    <span [ngClass]="'field__error'" [attr.id]="instanceId + '-error'">
      <ng-content select="[slot=error]" />
    </span>
    <ng-container *ngIf="validating">
      <span [ngClass]="'field__validatingIndicator'">
        <ng-content select="[slot=validatingIndicator]" />
      </span>
    </ng-container>
  </div>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldComponent {
  @Input() name!: string;
  @Input() id?: string;
  @Input() required?: boolean;
  @Input() disabled?: boolean;
  @Input() readOnly?: boolean;
  private readonly inputValue = signal<string | undefined>(undefined);
  @Input() get value(): string | undefined { return this.inputValue(); }
  set value(value: string | undefined) { this.inputValue.set(value); }
  @Input() defaultValue?: string;
  @Input() onChange?: (value: string) => void;
  @Input() validate?: ((value: string, context: { name: string; touched: boolean; dirty: boolean }) => string | string[] | null | Promise<string | string[] | null>);
  @Input() status?: FieldStatus;
  @Input() validating?: boolean;
  @Input() class?: string;

  protected readonly instanceId = `fsds-field-${nextInstanceId++}`;
  private fieldAssociation = inject(FieldAssociationService).connect(() => ({
    controlId: `${this.instanceId}-control`,
    describedBy: [this.status !== 'invalid' ? `${this.instanceId}-help` : null, this.status === 'invalid' ? `${this.instanceId}-error` : null].filter(Boolean).join(" ") || undefined,
  }));

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useField>;
  protected get behavior(): ReturnType<typeof useField> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useField({
    value: () => this.value,
    defaultValue: this.defaultValue,
    onChange: (v) => this.onChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "field",
      this.status ? `field--${this.status}` : null,
      this.disabled ? "field--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-field-header",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldHeaderComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["field__header", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
