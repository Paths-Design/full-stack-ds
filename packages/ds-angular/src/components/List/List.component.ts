// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgSwitch, NgSwitchCase, NgTemplateOutlet } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ListElement = "ul" | "ol" | "dl";
export type ListVariant = "default" | "unstyled" | "inline" | "divided" | "spaced";
export type ListMarker = "default" | "none" | "disc" | "circle" | "square" | "decimal" | "alpha" | "roman";
export type ListSpacing = "none" | "sm" | "md" | "lg";
export type ListSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-list",
  standalone: true,
  imports: [NgClass, NgSwitch, NgSwitchCase, NgTemplateOutlet],
  host: { "data-fsds-component": "list" },
  template: `<ng-template #fsdsPolymorphicBody>
  <ng-content />
</ng-template>
<ng-container [ngSwitch]="this.as || 'ul'">
  <ul [ngClass]="classes()" data-fsds-box="" *ngSwitchCase="'ul'">
    <ng-container [ngTemplateOutlet]="fsdsPolymorphicBody" />
  </ul>
  <ol [ngClass]="classes()" data-fsds-box="" *ngSwitchCase="'ol'">
    <ng-container [ngTemplateOutlet]="fsdsPolymorphicBody" />
  </ol>
  <dl [ngClass]="classes()" data-fsds-box="" *ngSwitchCase="'dl'">
    <ng-container [ngTemplateOutlet]="fsdsPolymorphicBody" />
  </dl>
</ng-container>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListComponent {
  @Input() as?: ListElement;
  @Input() variant?: ListVariant = "default";
  @Input() marker?: ListMarker = "default";
  @Input() spacing?: ListSpacing;
  @Input() size?: ListSize;
  @Input() class?: string;

  classes(): string {
    return [
      "list",
      this.as ? `list--${this.as}` : null,
      (this.variant ?? "default") ? `list--variant-${(this.variant ?? "default")}` : null,
      (this.marker ?? "default") ? `list--marker-${(this.marker ?? "default")}` : null,
      this.spacing ? `list--spacing-${this.spacing}` : null,
      this.size ? `list--size-${this.size}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
