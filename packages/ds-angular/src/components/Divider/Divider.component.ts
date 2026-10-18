// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-divider",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "divider" },
  template: `<hr [ngClass]="classes()" data-fsds-box="" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerComponent {
  @Input() orientation?: "horizontal" | "vertical";
  @Input() decorative?: boolean;
  @Input() thickness?: string;
  @Input() title?: string;
  @Input() class?: string;

  classes(): string {
    return [
      "divider",
      this.orientation ? `divider--${this.orientation}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
