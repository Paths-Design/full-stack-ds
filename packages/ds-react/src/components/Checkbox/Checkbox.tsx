// @generated:start imports
import { type LabelHTMLAttributes, useEffect, useRef } from "react";
import { Stack } from "../../primitives";
import { useCheckbox } from "./useCheckbox";
import { useFieldAssociation } from "../../primitives/hooks";
import "./Checkbox.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CheckboxSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface CheckboxProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, "ariaLabel" | "ariaLabelledby" | "checked" | "children" | "className" | "data-testid" | "defaultChecked" | "disabled" | "indeterminate" | "name" | "onChange" | "size" | "value"> {
  size?: CheckboxSize;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  name?: string;
  value?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function Checkbox({
  checked: controlledChecked,
  defaultChecked,
  onChange,
  size = "md",
  disabled,
  className,
  "data-testid": testId,
  indeterminate,
  name,
  value,
  ariaLabel,
  ariaLabelledby,
  ...rest
}: CheckboxProps) {
  const { checked, setChecked } = useCheckbox({
    checked: controlledChecked,
    defaultChecked,
    onChange,
  });

  const classNames = [
    "checkbox",
    size && `checkbox--${size}`,
    checked && "checkbox--checked",
    disabled && "checkbox--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const fieldAssociation = useFieldAssociation();

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
  <Stack layout="native" as="label" className={`${classNames}`} data-testid={testId} data-fsds-component="checkbox" data-fsds-box="" {...rest}>
    <input className="checkbox__input" type="checkbox" onChange={(e) => setChecked((e.currentTarget as HTMLInputElement).checked)} checked={checked} disabled={disabled} name={name} value={value} aria-label={ariaLabel} aria-labelledby={ariaLabelledby} aria-checked={(indeterminate ? "mixed" : checked) as "mixed" | "true" | "false" | boolean} id={fieldAssociation?.controlId} aria-describedby={fieldAssociation?.describedBy} ref={inputRef} />
    <span className="checkbox__indicator" aria-hidden="true" />
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
