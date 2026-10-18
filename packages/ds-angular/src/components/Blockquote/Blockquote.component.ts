// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type BlockquoteVariant = "default" | "bordered" | "highlighted";
export type BlockquoteSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-blockquote",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "blockquote" },
  template: `<blockquote [ngClass]="classes()" data-fsds-box="">
  <ng-content />
</blockquote>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockquoteComponent {
  @Input() cite?: string;
  @Input() variant?: BlockquoteVariant;
  @Input() size?: BlockquoteSize;
  @Input() class?: string;

  classes(): string {
    return [
      "blockquote",
      this.variant ? `blockquote--${this.variant}` : null,
      this.size ? `blockquote--${this.size}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
