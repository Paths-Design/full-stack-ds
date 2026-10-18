// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import "./Badge.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type BadgeVariant = "default" | "status" | "counter" | "tag";

export type BadgeIntent = "info" | "success" | "warning" | "danger";

export type BadgeSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "className" | "data-testid" | "icon" | "intent" | "showStatusIcon" | "size" | "variant"> {
  variant?: BadgeVariant;
  intent?: BadgeIntent;
  size?: BadgeSize;
  icon?: ReactNode;
  showStatusIcon?: boolean;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents
export interface BadgeContentProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function BadgeContent({
  children,
  className,
  "data-testid": testId,
}: BadgeContentProps) {
  const classNames = ["badge__content", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
export function Badge({
  variant,
  intent,
  size,
  className,
  "data-testid": testId,
  children,
  icon,
  showStatusIcon: _showStatusIcon,
  ...rest
}: BadgeProps) {
  const classNames = [
    "badge",
    variant && `badge--${variant}`,
    intent && `badge--${intent}`,
    size && `badge--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="span" className={`${classNames}`} data-testid={testId} data-fsds-component="badge" data-fsds-box="" {...rest}>
    {icon ? (
      <span className="badge__icon" aria-hidden="true">
        {icon}
      </span>
    ) : null}
    <span className="badge__content">
      {children}
    </span>
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
