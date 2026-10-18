// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
import { IconComponent } from "../Icon/Icon.component.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type StatusIntent = "info" | "success" | "warning" | "danger" | "error";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-status",
  standalone: true,
  imports: [NgClass, IconComponent],
  host: { "data-fsds-component": "status" },
  template: `<span [ngClass]="classes()" data-fsds-box="">
  <fsds-icon [ngClass]="'status__icon'" size="sm" [name]="(status === 'info' ? 'info' : (status === 'success' ? 'check' : (status === 'warning' ? 'triangle-alert' : (status === 'danger' ? 'triangle-alert' : 'triangle-alert'))))"></fsds-icon>
  <span [ngClass]="'status__label'">
    <ng-content />
  </span>
</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusComponent {
  @Input() status!: StatusIntent;
  @Input() class?: string;

  classes(): string {
    return [
      "status",
      this.status ? `status--${this.status}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
