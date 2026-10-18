// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf, NgFor } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
import { resolveIcon } from "@full-stack-ds/iconography";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type NavTreeIconSize = "sm" | "md";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
const ICON_GLYPH_SIZE_HINTS: Record<string, number> = { "sm": 16, "md": 20 };

@Component({
  selector: "fsds-nav-tree",
  standalone: true,
  imports: [NgClass, NgIf, NgFor],
  host: { "data-fsds-component": "nav-tree" },
  template: `<li [ngClass]="classes()" data-fsds-box="" role="listitem">
  <div [ngClass]="'nav-tree__heading'">
    <ng-container *ngIf="icon">
      <span [ngClass]="'nav-tree__icon'" aria-hidden="true">
        <ng-container *ngIf="iconGlyph as glyph">
          <svg fill="none" xmlns="http://www.w3.org/2000/svg" [attr.data-fsds-icon]="glyph.name" [attr.viewBox]="glyph.viewBox" [attr.width]="(this.iconGlyphPx ?? glyph.size)" [attr.height]="(this.iconGlyphPx ?? glyph.size)">
            <ng-container *ngFor="let glyphPath of glyph.paths">
              <path [attr.d]="glyphPath.d" [attr.fill]="glyphPath.fill" [attr.stroke]="glyphPath.stroke" [attr.stroke-width]="glyphPath.strokeWidth" [attr.stroke-linecap]="glyphPath.strokeLineCap" [attr.stroke-linejoin]="glyphPath.strokeLineJoin" [attr.stroke-dasharray]="glyphPath.strokeDasharray" [attr.fill-rule]="glyphPath.fillRule" [attr.clip-rule]="glyphPath.clipRule" />
            </ng-container>
          </svg>
        </ng-container>
      </span>
    </ng-container>
    <ng-container *ngIf="href">
      <a [ngClass]="'nav-tree__headingLink'" [href]="href">
        {{ label }}
      </a>
    </ng-container>
    <ng-container *ngIf="!href">
      <span [ngClass]="'nav-tree__headingLabel'">
        {{ label }}
      </span>
    </ng-container>
  </div>
  <ul [ngClass]="'nav-tree__list'">
    <ng-content />
  </ul>
</li>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavTreeComponent {
  @Input() label!: string;
  @Input() href?: string;
  @Input() icon?: string;
  @Input() iconSize?: NavTreeIconSize = "sm";
  @Input() class?: string;

  classes(): string {
    return [
      "nav-tree",
      (this.iconSize ?? "sm") ? `nav-tree--${(this.iconSize ?? "sm")}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  get iconGlyphPx(): number | undefined {
    return ICON_GLYPH_SIZE_HINTS[(this.iconSize ?? "sm")];
  }

  get iconGlyph() {
    return resolveIcon(this.icon ?? "", this.iconGlyphPx ?? Number.NaN);
  }
}

@Component({
  selector: "fsds-nav-tree-list",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="ul" variant="horizontal" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavTreeListComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["nav-tree__list", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-nav-tree-item",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack as="li" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavTreeItemComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["nav-tree__item", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
