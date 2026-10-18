// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf, NgFor } from "@angular/common";
import { resolveIcon } from "@full-stack-ds/iconography";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
const ICON_GLYPH_SIZE_HINTS: Record<string, number> = { "sm": 16, "md": 20, "lg": 24, "xl": 32 };

@Component({
  selector: "fsds-icon",
  standalone: true,
  imports: [NgClass, NgIf, NgFor],
  host: { "data-fsds-component": "icon" },
  template: `<span [ngClass]="classes()" [attr.role]="((decorative ?? true) ? 'presentation' : 'img')" [attr.aria-hidden]="((decorative ?? true) ? 'true' : 'false')" [attr.aria-label]="ariaLabel" data-fsds-box="">
  <ng-container *ngIf="iconGlyph as glyph">
    <svg fill="none" xmlns="http://www.w3.org/2000/svg" [attr.data-fsds-icon]="glyph.name" [attr.viewBox]="glyph.viewBox" [attr.width]="(this.iconGlyphPx ?? glyph.size)" [attr.height]="(this.iconGlyphPx ?? glyph.size)">
      <ng-container *ngFor="let glyphPath of glyph.paths">
        <path [attr.d]="glyphPath.d" [attr.fill]="glyphPath.fill" [attr.stroke]="glyphPath.stroke" [attr.stroke-width]="glyphPath.strokeWidth" [attr.stroke-linecap]="glyphPath.strokeLineCap" [attr.stroke-linejoin]="glyphPath.strokeLineJoin" [attr.stroke-dasharray]="glyphPath.strokeDasharray" [attr.fill-rule]="glyphPath.fillRule" [attr.clip-rule]="glyphPath.clipRule" />
      </ng-container>
    </svg>
  </ng-container>
</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @Input() name!: string;
  @Input() size?: "sm" | "md" | "lg" | "xl" = "md";
  @Input() decorative?: boolean = true;
  @Input() ariaLabel?: string;
  @Input() class?: string;

  classes(): string {
    return [
      "icon",
      (this.size ?? "md") ? `icon--${(this.size ?? "md")}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  get iconGlyphPx(): number | undefined {
    return ICON_GLYPH_SIZE_HINTS[(this.size ?? "md")];
  }

  get iconGlyph() {
    return resolveIcon(this.name, this.iconGlyphPx ?? Number.NaN);
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
