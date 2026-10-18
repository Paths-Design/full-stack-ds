// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ImageAspectRatio = "square" | "video" | "photo" | "wide" | "portrait";
export type ImageObjectFit = "cover" | "contain" | "fill" | "scale-down" | "none";
export type ImageLoading = "lazy" | "eager";
export type ImageRadius = "none" | "sm" | "md" | "lg" | "full";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-image",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "image" },
  template: `<img [ngClass]="classes()" [src]="src" [alt]="alt" [attr.width]="width" [attr.height]="height" [loading]="loading" [sizes]="sizes" [style.--fsds-image-prop-aspect-ratio]="(aspectRatio === 'square' ? '1 / 1' : (aspectRatio === 'video' ? '16 / 9' : (aspectRatio === 'photo' ? '4 / 3' : (aspectRatio === 'wide' ? '21 / 9' : (aspectRatio === 'portrait' ? '2 / 3' : 'auto')))))" [style.--fsds-image-prop-object-fit]="objectFit" [style.--fsds-image-prop-object-position]="objectPosition" data-fsds-box="" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageComponent {
  @Input() src?: string;
  @Input() alt!: string;
  @Input() width?: number;
  @Input() height?: number;
  @Input() aspectRatio?: ImageAspectRatio;
  @Input() objectFit?: ImageObjectFit;
  @Input() objectPosition?: string;
  @Input() loading?: ImageLoading;
  @Input() sizes?: string;
  @Input() radius?: ImageRadius;
  @Input() showPlaceholder?: boolean;
  @Input() fallbackSrc?: string;
  @Input() class?: string;
  @Input() size?: string;

  classes(): string {
    return [
      "image",
      this.radius ? `image--radius-${this.radius}` : null,
      this.size ? `image--size-${this.size}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
