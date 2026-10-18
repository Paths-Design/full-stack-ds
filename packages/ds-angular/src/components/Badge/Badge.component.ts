// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type BadgeVariant = "default" | "status" | "counter" | "tag";
export type BadgeIntent = "info" | "success" | "warning" | "danger";
export type BadgeSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-badge",
  standalone: true,
  imports: [NgClass, NgIf],
  host: { "data-fsds-component": "badge" },
  template: `<span [ngClass]="classes()" data-fsds-box="">
  <ng-container *ngIf="icon">
    <span [ngClass]="'badge__icon'" aria-hidden="true">
      {{ icon }}
    </span>
  </ng-container>
  <span [ngClass]="'badge__content'">
    <ng-content />
  </span>
</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  @Input() variant?: BadgeVariant;
  @Input() intent?: BadgeIntent;
  @Input() size?: BadgeSize;
  @Input() icon?: unknown;
  @Input() showStatusIcon?: boolean;
  @Input() class?: string;

  classes(): string {
    return [
      "badge",
      this.variant ? `badge--${this.variant}` : null,
      this.intent ? `badge--${this.intent}` : null,
      this.size ? `badge--${this.size}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-badge-content",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeContentComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["badge__content", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
