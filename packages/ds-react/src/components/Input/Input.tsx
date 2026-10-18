// @generated:start imports
import { type InputHTMLAttributes } from "react";
import { Stack } from "../../primitives";
import { useInput } from "./useInput";
import { useFieldAssociation } from "../../primitives/hooks";
import "./Input.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "ariaLabel" | "ariaLabelledby" | "children" | "className" | "data-testid" | "defaultValue" | "disabled" | "invalid" | "name" | "onChange" | "placeholder" | "required" | "type" | "value"> {
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  name?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function Input({
  value: controlledValue,
  defaultValue,
  onChange,
  disabled,
  invalid,
  className,
  "data-testid": testId,
  type,
  placeholder,
  required,
  name,
  ariaLabel,
  ariaLabelledby,
  ...rest
}: InputProps) {
  const { value, setValue } = useInput({
    value: controlledValue,
    defaultValue,
    onChange,
  });

  const classNames = [
    "input",
    disabled && "input--disabled",
    invalid && "input--invalid",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const fieldAssociation = useFieldAssociation();

  return (
  <Stack layout="native" as="input" className={`${classNames}`} onChange={(e) => setValue((e.currentTarget as HTMLInputElement).value)} type={type} value={value} disabled={disabled} aria-invalid={invalid} placeholder={placeholder} name={name} required={required} aria-label={ariaLabel} aria-labelledby={ariaLabelledby} id={fieldAssociation?.controlId} aria-describedby={fieldAssociation?.describedBy} data-testid={testId} data-fsds-component="input" data-fsds-box="" {...rest} />
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
