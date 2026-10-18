// @generated:start imports
import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, Injector, runInInjectionContext, untracked } from "@angular/core";
import { NgClass } from "@angular/common";
import { useSwitch } from "./useSwitch.js";
import { FieldAssociationService } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SwitchSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-switch",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "switch" },
  template: `<label [ngClass]="classes()" data-fsds-box="">
  <input [ngClass]="'switch__input'" type="checkbox" role="switch" (change)="handleCheckedChange($event)" [checked]="behavior.checked()" [disabled]="disabled" [name]="name" [value]="value" [attr.id]="fieldAssociation?.current?.controlId" [attr.aria-describedby]="fieldAssociation?.current?.describedBy" />
  <span [ngClass]="'switch__track'" aria-hidden="true">
    <span [ngClass]="'switch__thumb'"></span>
  </span>
  <ng-content />
</label>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent {
  private readonly inputChecked = signal<boolean | undefined>(undefined);
  @Input() get checked(): boolean | undefined { return this.inputChecked(); }
  set checked(value: boolean | undefined) { this.inputChecked.set(value); }
  @Input() defaultChecked?: boolean;
  @Input() onChange?: (checked: boolean) => void;
  @Input() size?: SwitchSize = "md";
  @Input() disabled?: boolean;
  @Input() name?: string;
  @Input() value?: string;
  @Input() class?: string;
  protected fieldAssociation = inject(FieldAssociationService, { optional: true });

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private initializedBehavior?: ReturnType<typeof useSwitch>;
  protected get behavior(): ReturnType<typeof useSwitch> {
    return this.initializedBehavior ??= untracked(() => runInInjectionContext(this.injector, () => useSwitch({
    checked: () => this.checked,
    defaultChecked: this.defaultChecked,
    onChange: (v) => this.onChange?.(v),
    destroyRef: this.destroyRef,
  })));
  }

  classes(): string {
    return [
      "switch",
      (this.size ?? "md") ? `switch--${(this.size ?? "md")}` : null,
      this.behavior.checked() ? "switch--checked" : null,
      this.disabled ? "switch--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  protected handleCheckedChange(event: Event): void {
    this.behavior.setChecked((event.target as HTMLInputElement).checked);
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
