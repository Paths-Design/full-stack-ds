// @generated:start imports
import { type ButtonHTMLAttributes } from "react";
import { Stack } from "../../primitives";
import { useToggleSwitch } from "./useToggleSwitch";
import "./ToggleSwitch.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ToggleSwitchSize = "small" | "medium" | "large";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface ToggleSwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ariaDescribedby" | "ariaLabel" | "checked" | "children" | "className" | "data-testid" | "defaultChecked" | "disabled" | "onChange" | "size"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: ToggleSwitchSize;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedby?: string;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function ToggleSwitch({
  checked: controlledChecked,
  defaultChecked,
  onChange,
  size = "medium",
  disabled,
  className,
  "data-testid": testId,
  ariaLabel,
  ariaDescribedby,
  ...rest
}: ToggleSwitchProps) {
  const { checked, setChecked } = useToggleSwitch({
    checked: controlledChecked,
    defaultChecked,
    onChange,
  });

  const classNames = [
    "toggle-switch",
    size && `toggle-switch--${size}`,
    checked && "toggle-switch--checked",
    disabled && "toggle-switch--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="button" className={`${classNames}`} type="button" onClick={() => setChecked(!checked)} aria-checked={checked} aria-label={ariaLabel} aria-describedby={ariaDescribedby} disabled={disabled} role="switch" data-testid={testId} data-fsds-component="toggle-switch" data-fsds-box="" {...rest} />
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
