// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { Button } from "../Button/Button";
import { useFsdsMessages } from "../../primitives/messages";
import "./Chip.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ChipType = "button" | "submit" | "reset";

export type ChipVariant = "default" | "selected" | "dismissible";

export type ChipSize = "small" | "medium" | "large";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface ChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "ariaExpanded" | "ariaLabel" | "ariaPressed" | "children" | "className" | "data-testid" | "disabled" | "dismissLabel" | "dismissible" | "icon" | "onClick" | "onDismiss" | "size" | "title" | "type" | "variant"> {
  type?: ChipType;
  variant?: ChipVariant;
  size?: ChipSize;
  disabled?: boolean;
  icon?: ReactNode;
  title?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  onClick?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
const ChipMessages = { dismiss: "Remove" };

export function Chip({
  variant,
  size,
  disabled,
  className,
  "data-testid": testId,
  children,
  type,
  icon,
  title,
  ariaLabel,
  ariaExpanded,
  ariaPressed,
  onClick,
  dismissible,
  onDismiss,
  dismissLabel: dismissLabelProp,
  ...rest
}: ChipProps) {
  const fsdsMessages = useFsdsMessages("Chip", ChipMessages);
  const dismissLabel = dismissLabelProp ?? fsdsMessages.dismiss;
  const classNames = [
    "chip",
    variant && `chip--${variant}`,
    size && `chip--${size}`,
    disabled && "chip--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="span" className={`${classNames}`} data-testid={testId} data-fsds-component="chip" data-fsds-box="" {...rest}>
    <Button className="chip__action" variant="ghost" onClick={onClick} type={type} disabled={disabled} ariaLabel={ariaLabel} ariaExpanded={ariaExpanded} ariaPressed={ariaPressed}>
      {icon ? (
        <span className="chip__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="chip__text">
        {children}
      </span>
    </Button>
    {dismissible ? (
      <Button className="chip__dismiss" type="button" variant="ghost" onClick={onDismiss} disabled={disabled} ariaLabel={dismissLabel} />
    ) : null}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
