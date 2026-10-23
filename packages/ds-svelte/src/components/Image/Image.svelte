<script module lang="ts">
// @generated:start publicTypes
export type ImageAspectRatio = "square" | "video" | "photo" | "wide" | "portrait";
export type ImageObjectFit = "cover" | "contain" | "fill" | "scale-down" | "none";
export type ImageLoading = "lazy" | "eager";
export type ImageRadius = "none" | "sm" | "md" | "lg" | "full";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports

// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
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
  class?: string;
}

let { src, alt, width, height, aspectRatio, objectFit, objectPosition, loading, sizes, radius, showPlaceholder, fallbackSrc, size, class: className }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "image",
    radius ? `image--radius-${radius}` : null,
    size ? `image--size-${size}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<img class={classes} src={src} alt={alt} width={width} height={height} loading={loading} sizes={sizes} style:--fsds-image-prop-aspect-ratio={(aspectRatio === "square" ? "1 / 1" : (aspectRatio === "video" ? "16 / 9" : (aspectRatio === "photo" ? "4 / 3" : (aspectRatio === "wide" ? "21 / 9" : (aspectRatio === "portrait" ? "2 / 3" : "auto")))))} style:--fsds-image-prop-object-fit={objectFit} style:--fsds-image-prop-object-position={objectPosition} data-fsds-component="image" data-fsds-box="" />
