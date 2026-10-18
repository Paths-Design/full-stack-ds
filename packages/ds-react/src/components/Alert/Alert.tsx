// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { Button } from "../Button/Button";
import { useFsdsMessages } from "../../primitives/messages";
import "./Alert.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type AlertIntent = "info" | "success" | "warning" | "danger";

export type AlertLevel = "inline" | "section" | "page";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "data-testid" | "dismissLabel" | "dismissible" | "icon" | "intent" | "level" | "onDismiss"> {
  intent?: AlertIntent;
  level?: AlertLevel;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  icon?: ReactNode;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents
export interface AlertBodyProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function AlertBody({
  children,
  className,
  "data-testid": testId,
}: AlertBodyProps) {
  const classNames = ["alert__body", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface AlertTitleProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function AlertTitle({
  children,
  className,
  "data-testid": testId,
}: AlertTitleProps) {
  const classNames = ["alert__title", className].filter(Boolean).join(" ");
  return (
    <Stack as="h3" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
const AlertMessages = { dismiss: "Dismiss" };

export function Alert({
  intent,
  level,
  className,
  "data-testid": testId,
  children,
  dismissible,
  onDismiss,
  dismissLabel: dismissLabelProp,
  icon,
  ...rest
}: AlertProps) {
  const fsdsMessages = useFsdsMessages("Alert", AlertMessages);
  const dismissLabel = dismissLabelProp ?? fsdsMessages.dismiss;
  const classNames = [
    "alert",
    intent && `alert--${intent}`,
    level && `alert--${level}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} role="alert" data-testid={testId} data-fsds-component="alert" data-fsds-box="" {...rest}>
    {icon ? (
      <span className="alert__icon" aria-hidden="true">
        {icon}
      </span>
    ) : null}
    {children}
    {dismissible ? (
      <Button className="alert__dismiss" type="button" onClick={onDismiss} ariaLabel={dismissLabel} />
    ) : null}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
