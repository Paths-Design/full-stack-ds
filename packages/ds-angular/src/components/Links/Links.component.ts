// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type LinkTarget = "_self" | "_blank" | "_parent" | "_top";
export type LinkSize = "small" | "medium" | "large";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-links",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "links" },
  template: `<a [ngClass]="classes()" [href]="href" [target]="target" [rel]="rel" data-fsds-box="">
  <ng-content />
</a>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinksComponent {
  @Input() href?: string;
  @Input() target?: LinkTarget;
  @Input() rel?: string;
  @Input() size?: LinkSize;
  @Input() disabled?: boolean;
  @Input() class?: string;

  classes(): string {
    return [
      "links",
      this.size ? `links--${this.size}` : null,
      this.disabled ? "links--disabled" : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
