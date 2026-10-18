// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SpinnerSize = "xs" | "sm" | "md" | "lg";
export type SpinnerThickness = "hairline" | "regular" | "bold";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-spinner",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "spinner" },
  template: `<div [ngClass]="classes()" [attr.aria-label]="label" [attr.aria-hidden]="ariaHidden" data-fsds-box="" role="status">
  <span [ngClass]="'spinner__visual'" aria-hidden="true"></span>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent {
  @Input() size?: SpinnerSize;
  @Input() thickness?: SpinnerThickness;
  @Input() ariaHidden?: boolean;
  @Input() label?: string;
  @Input() inline?: boolean;
  @Input() showAfterMs?: number;
  @Input() class?: string;

  classes(): string {
    return [
      "spinner",
      this.size ? `spinner--${this.size}` : null,
      this.thickness ? `spinner--${this.thickness}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
