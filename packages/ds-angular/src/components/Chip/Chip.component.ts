// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { ButtonComponent } from "../Button/Button.component.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ChipType = "button" | "submit" | "reset";
export type ChipVariant = "default" | "selected" | "dismissible";
export type ChipSize = "small" | "medium" | "large";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-chip",
  standalone: true,
  imports: [NgClass, NgIf, ButtonComponent],
  host: { "data-fsds-component": "chip" },
  template: `<span [ngClass]="classes()" data-fsds-box="">
  <fsds-button [ngClass]="'chip__action'" variant="ghost" (click)="onClick && onClick()" [type]="type" [disabled]="disabled" [ariaLabel]="ariaLabel" [ariaExpanded]="ariaExpanded" [ariaPressed]="ariaPressed">
    <ng-container *ngIf="icon">
      <span [ngClass]="'chip__icon'" aria-hidden="true">
        {{ icon }}
      </span>
    </ng-container>
    <span [ngClass]="'chip__text'">
      <ng-content />
    </span>
  </fsds-button>
  <ng-container *ngIf="dismissible">
    <fsds-button [ngClass]="'chip__dismiss'" type="button" variant="ghost" (click)="onDismiss && onDismiss()" [disabled]="disabled" [ariaLabel]="(dismissLabel ?? 'Remove')"></fsds-button>
  </ng-container>
</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipComponent {
  @Input() type?: ChipType;
  @Input() variant?: ChipVariant;
  @Input() size?: ChipSize;
  @Input() disabled?: boolean;
  @Input() icon?: unknown;
  @Input() title?: string;
  @Input() ariaLabel?: string;
  @Input() ariaExpanded?: boolean;
  @Input() ariaPressed?: boolean;
  @Input() onClick?: () => void;
  @Input() dismissible?: boolean;
  @Input() onDismiss?: () => void;
  @Input() dismissLabel?: string = "Remove";
  @Input() class?: string;

  classes(): string {
    return [
      "chip",
      this.variant ? `chip--${this.variant}` : null,
      this.size ? `chip--${this.size}` : null,
      this.disabled ? "chip--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
