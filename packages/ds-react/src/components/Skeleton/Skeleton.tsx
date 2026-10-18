// @generated:start imports
import { type HTMLAttributes } from "react";
import { Stack } from "../../primitives";
import "./Skeleton.css";
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

// @generated:start props
export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, "animate" | "ariaLabel" | "aspectRatio" | "children" | "className" | "data-testid" | "decorative" | "density" | "lines" | "radius" | "variant"> {
  variant?: SkeletonVariant;
  animate?: SkeletonAnimate;
  density?: SkeletonDensity;
  aspectRatio?: string;
  lines?: number;
  radius?: SkeletonRadius;
  decorative?: boolean;
  ariaLabel?: string;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function Skeleton({
  variant = "block",
  animate = "shimmer",
  density = "regular",
  className,
  "data-testid": testId,
  aspectRatio: _aspectRatio,
  lines,
  radius: _radius,
  decorative = true,
  ariaLabel,
  ...rest
}: SkeletonProps) {
  const classNames = [
    "skeleton",
    variant && `skeleton--${variant}`,
    animate && `skeleton--${animate}`,
    density && `skeleton--${density}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} role={(decorative ? "presentation" : "status")} aria-busy={(decorative ? "false" : "true")} aria-hidden={(decorative ? "true" : "false")} aria-label={ariaLabel} data-testid={testId} data-fsds-component="skeleton" data-fsds-box="" {...rest}>
    {lines ? (
      <div className="skeleton__stack">
        {Array.from({ length: lines }, (_, index) => (
          <div className="skeleton__row" key={index}>
            <div className="skeleton__shape" aria-hidden="true" />
          </div>
        ))}
      </div>
    ) : null}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
