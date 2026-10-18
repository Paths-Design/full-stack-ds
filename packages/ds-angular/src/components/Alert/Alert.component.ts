// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
import { ButtonComponent } from "../Button/Button.component.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type AlertIntent = "info" | "success" | "warning" | "danger";
export type AlertLevel = "inline" | "section" | "page";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-alert",
  standalone: true,
  imports: [NgClass, NgIf, ButtonComponent],
  host: { "data-fsds-component": "alert" },
  template: `<div [ngClass]="classes()" role="alert" data-fsds-box="">
  <ng-container *ngIf="icon">
    <span [ngClass]="'alert__icon'" aria-hidden="true">
      {{ icon }}
    </span>
  </ng-container>
  <ng-content />
  <ng-container *ngIf="dismissible">
    <fsds-button [ngClass]="'alert__dismiss'" type="button" (click)="onDismiss && onDismiss()" [ariaLabel]="(dismissLabel ?? 'Dismiss')"></fsds-button>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  @Input() intent?: AlertIntent;
  @Input() level?: AlertLevel;
  @Input() dismissible?: boolean;
  @Input() onDismiss?: () => void;
  @Input() dismissLabel?: string = "Dismiss";
  @Input() icon?: unknown;
  @Input() class?: string;

  classes(): string {
    return [
      "alert",
      this.intent ? `alert--${this.intent}` : null,
      this.level ? `alert--${this.level}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-alert-body",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertBodyComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["alert__body", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-alert-title",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="h3" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertTitleComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["alert__title", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
