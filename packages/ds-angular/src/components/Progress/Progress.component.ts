// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ProgressVariant = "linear" | "circular";
export type ProgressSize = "sm" | "md" | "lg";
export type ProgressIntent = "info" | "success" | "warning" | "danger";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-progress",
  standalone: true,
  imports: [NgClass, NgIf],
  host: { "data-fsds-component": "progress" },
  template: `<div [ngClass]="classes()" role="progressbar" [attr.aria-valuenow]="value" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="label" data-fsds-box="">
  <span [ngClass]="'progress__track'" aria-hidden="true">
    <span [ngClass]="'progress__fill'" [style.--fsds-progress-fill-width]="value"></span>
  </span>
  <ng-container *ngIf="showValue">
    <span [ngClass]="'progress__value'">
      <ng-content />
    </span>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressComponent {
  @Input() value?: number;
  @Input() variant?: ProgressVariant;
  @Input() size?: ProgressSize;
  @Input() intent?: ProgressIntent;
  @Input() label?: string;
  @Input() showValue?: boolean;
  @Input() formatValue?: (value: number, max: number) => string;
  @Input() class?: string;

  classes(): string {
    return [
      "progress",
      this.variant ? `progress--${this.variant}` : null,
      this.size ? `progress--${this.size}` : null,
      this.intent ? `progress--${this.intent}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
