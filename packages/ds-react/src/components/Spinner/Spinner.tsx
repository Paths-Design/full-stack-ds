// @generated:start imports
import { type HTMLAttributes } from "react";
import { Stack } from "../../primitives";
import "./Spinner.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SpinnerSize = "xs" | "sm" | "md" | "lg";

export type SpinnerThickness = "hairline" | "regular" | "bold";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface SpinnerProps extends Omit<HTMLAttributes<HTMLDivElement>, "ariaHidden" | "children" | "className" | "data-testid" | "inline" | "label" | "showAfterMs" | "size" | "thickness"> {
  size?: SpinnerSize;
  thickness?: SpinnerThickness;
  ariaHidden?: boolean;
  label?: string;
  inline?: boolean;
  showAfterMs?: number;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function Spinner({
  size,
  thickness,
  className,
  "data-testid": testId,
  ariaHidden,
  label,
  inline: _inline,
  showAfterMs: _showAfterMs,
  ...rest
}: SpinnerProps) {
  const classNames = [
    "spinner",
    size && `spinner--${size}`,
    thickness && `spinner--${thickness}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} aria-label={label} aria-hidden={ariaHidden} role="status" data-testid={testId} data-fsds-component="spinner" data-fsds-box="" {...rest}>
    <span className="spinner__visual" aria-hidden="true" />
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
