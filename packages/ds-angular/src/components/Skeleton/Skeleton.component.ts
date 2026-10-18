// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf, NgFor } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SkeletonVariant = "block" | "text" | "avatar" | "media" | "dataviz" | "actions";
export type SkeletonAnimate = "shimmer" | "wipe" | "pulse" | "none";
export type SkeletonDensity = "compact" | "regular" | "spacious";
export type SkeletonRadius = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-skeleton",
  standalone: true,
  imports: [NgClass, NgIf, NgFor],
  host: { "data-fsds-component": "skeleton" },
  template: `<div [ngClass]="classes()" [attr.role]="((decorative ?? true) ? 'presentation' : 'status')" [attr.aria-busy]="((decorative ?? true) ? 'false' : 'true')" [attr.aria-hidden]="((decorative ?? true) ? 'true' : 'false')" [attr.aria-label]="ariaLabel" data-fsds-box="">
  <ng-container *ngIf="lines">
    <div [ngClass]="'skeleton__stack'">
      <ng-container *ngFor="let _ of arrayFromCount(lines); let index = index; trackBy: trackByIndex">
        <div [ngClass]="'skeleton__row'">
          <div [ngClass]="'skeleton__shape'" aria-hidden="true"></div>
        </div>
      </ng-container>
    </div>
  </ng-container>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  @Input() variant?: SkeletonVariant = "block";
  @Input() animate?: SkeletonAnimate = "shimmer";
  @Input() density?: SkeletonDensity = "regular";
  @Input() aspectRatio?: string;
  @Input() lines?: number;
  @Input() radius?: SkeletonRadius;
  @Input() decorative?: boolean = true;
  @Input() ariaLabel?: string;
  @Input() class?: string;

  classes(): string {
    return [
      "skeleton",
      (this.variant ?? "block") ? `skeleton--${(this.variant ?? "block")}` : null,
      (this.animate ?? "shimmer") ? `skeleton--${(this.animate ?? "shimmer")}` : null,
      (this.density ?? "regular") ? `skeleton--${(this.density ?? "regular")}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }

  // Materializes an array of length N for *ngFor count-iteration.
  // Memoized by length so re-renders don't churn the iteration source.
  private _arrayFromCountCache = new Map<number, ReadonlyArray<undefined>>();
  protected arrayFromCount(n: number | undefined): ReadonlyArray<undefined> {
    const len = typeof n === "number" && n > 0 ? Math.floor(n) : 0;
    let arr = this._arrayFromCountCache.get(len);
    if (!arr) {
      arr = Array.from({ length: len });
      this._arrayFromCountCache.set(len, arr);
    }
    return arr;
  }

  protected readonly trackByIndex = (index: number): number => index;
}
// @generated:end

// @custom:start trailing

// @custom:end
