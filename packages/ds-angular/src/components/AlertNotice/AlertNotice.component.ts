// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type AlertNoticeStatus = "info" | "success" | "warning" | "error";
export type AlertNoticeLevel = "page" | "section" | "inline";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-alert-notice",
  standalone: true,
  imports: [NgClass, NgIf],
  host: { "data-fsds-component": "alert-notice" },
  template: `<div [ngClass]="classes()" role="alert" data-fsds-box="">
  <ng-container *ngIf="icon">
    <span [ngClass]="'alert-notice__icon'" aria-hidden="true">
      {{ icon }}
    </span>
  </ng-container>
  <ng-content />
  <ng-container *ngIf="dismissible">
    <button [ngClass]="'alert-notice__dismiss'" type="button" (click)="onDismiss && onDismiss()" [attr.aria-label]="(dismissLabel ?? 'Dismiss')"></button>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertNoticeComponent {
  @Input() status?: AlertNoticeStatus;
  @Input() level?: AlertNoticeLevel;
  @Input() dismissible?: boolean;
  @Input() onDismiss?: () => void;
  @Input() dismissLabel?: string = "Dismiss";
  @Input() icon?: unknown;
  @Input() class?: string;

  classes(): string {
    return [
      "alert-notice",
      this.status ? `alert-notice--${this.status}` : null,
      this.level ? `alert-notice--${this.level}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-alert-notice-body",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertNoticeBodyComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["alert-notice__body", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-alert-notice-title",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="h3" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertNoticeTitleComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["alert-notice__title", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
