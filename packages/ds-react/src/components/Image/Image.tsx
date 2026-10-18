// @generated:start imports
import { type CSSProperties, type ImgHTMLAttributes } from "react";
import { Stack } from "../../primitives";
import "./Image.css";
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

// @generated:start props
export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "aspectRatio" | "children" | "className" | "data-testid" | "fallbackSrc" | "height" | "loading" | "objectFit" | "objectPosition" | "radius" | "showPlaceholder" | "size" | "sizes" | "src" | "width"> {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: ImageAspectRatio;
  objectFit?: ImageObjectFit;
  objectPosition?: string;
  loading?: ImageLoading;
  sizes?: string;
  radius?: ImageRadius;
  showPlaceholder?: boolean;
  fallbackSrc?: string;
  size?: string;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function Image({
  radius,
  size,
  className,
  "data-testid": testId,
  src,
  alt,
  width,
  height,
  aspectRatio,
  objectFit,
  objectPosition,
  loading,
  sizes,
  showPlaceholder: _showPlaceholder,
  fallbackSrc: _fallbackSrc,
  ...rest
}: ImageProps) {
  const classNames = [
    "image",
    radius && `image--radius-${radius}`,
    size && `image--size-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="img" className={`${classNames}`} src={src} alt={alt} width={width} height={height} loading={loading} sizes={sizes} data-testid={testId} data-fsds-component="image" data-fsds-box="" {...rest} style={{ "--fsds-image-prop-aspect-ratio": (aspectRatio === "square" ? "1 / 1" : (aspectRatio === "video" ? "16 / 9" : (aspectRatio === "photo" ? "4 / 3" : (aspectRatio === "wide" ? "21 / 9" : (aspectRatio === "portrait" ? "2 / 3" : "auto"))))), "--fsds-image-prop-object-fit": objectFit, "--fsds-image-prop-object-position": objectPosition, ...rest.style } as CSSProperties} />
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
