// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { useFsdsMessages } from "../../primitives/messages";
import "./AlertNotice.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type AlertNoticeStatus = "info" | "success" | "warning" | "error";

export type AlertNoticeLevel = "page" | "section" | "inline";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface AlertNoticeProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "data-testid" | "dismissLabel" | "dismissible" | "icon" | "level" | "onDismiss" | "status"> {
  status?: AlertNoticeStatus;
  level?: AlertNoticeLevel;
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
export interface AlertNoticeBodyProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function AlertNoticeBody({
  children,
  className,
  "data-testid": testId,
}: AlertNoticeBodyProps) {
  const classNames = ["alert-notice__body", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface AlertNoticeTitleProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function AlertNoticeTitle({
  children,
  className,
  "data-testid": testId,
}: AlertNoticeTitleProps) {
  const classNames = ["alert-notice__title", className].filter(Boolean).join(" ");
  return (
    <Stack as="h3" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
const AlertNoticeMessages = { dismiss: "Dismiss" };

export function AlertNotice({
  status,
  level,
  className,
  "data-testid": testId,
  children,
  dismissible,
  onDismiss,
  dismissLabel: dismissLabelProp,
  icon,
  ...rest
}: AlertNoticeProps) {
  const fsdsMessages = useFsdsMessages("AlertNotice", AlertNoticeMessages);
  const dismissLabel = dismissLabelProp ?? fsdsMessages.dismiss;
  const classNames = [
    "alert-notice",
    status && `alert-notice--${status}`,
    level && `alert-notice--${level}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} role="alert" data-testid={testId} data-fsds-component="alert-notice" data-fsds-box="" {...rest}>
    {icon ? (
      <span className="alert-notice__icon" aria-hidden="true">
        {icon}
      </span>
    ) : null}
    {children}
    {dismissible ? (
      <button className="alert-notice__dismiss" type="button" onClick={onDismiss} aria-label={dismissLabel} />
    ) : null}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
