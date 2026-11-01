// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
import { canActivateInteraction, isActivationDisabled } from "../../primitives/interaction.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type LinkTarget = "_self" | "_blank" | "_parent" | "_top";
export type LinkSize = "small" | "medium" | "large";
export type LinkActivationEvent = { readonly defaultPrevented: boolean; preventDefault(): void };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-links",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "links" },
  template: `<a [ngClass]="classes()" role="link" tabindex="0" (click)="canActivateInteraction($event, false, isActivationDisabled(disabled)) && (onClick)?.($event)" [attr.href]="isActivationDisabled(disabled) ? null : href" [attr.target]="target" [attr.rel]="rel" [attr.aria-disabled]="disabled" data-fsds-box="">
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
  @Input() onClick?: (event: LinkActivationEvent) => void;
  @Input() class?: string;
  protected canActivateInteraction = canActivateInteraction;
  protected isActivationDisabled = isActivationDisabled;

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
