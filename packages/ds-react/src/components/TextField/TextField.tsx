// @generated:start imports
import { type HTMLAttributes, type ReactNode, useId } from "react";
import { useNativeTextValue } from "../../primitives/useNativeTextValue";
import { Stack } from "../../primitives";
import { useTextField } from "./useTextField";
import "./TextField.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface TextFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "ariaDescribedby" | "children" | "className" | "data-testid" | "defaultValue" | "disabled" | "invalid" | "name" | "onChange" | "required" | "type" | "value"> {
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  ariaDescribedby?: string;
  className?: string;
  "data-testid"?: string;
  slots?: {
    description?: ReactNode;
    error?: ReactNode;
    label?: ReactNode;
  };
}
// @generated:end

// @generated:start subcomponents
export interface TextFieldDescriptionProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function TextFieldDescription({
  children,
  className,
  "data-testid": testId,
}: TextFieldDescriptionProps) {
  const classNames = ["text-field__description", className].filter(Boolean).join(" ");
  return (
    <Stack as="p" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
export function TextField({
  value: controlledValue,
  defaultValue,
  onChange,
  invalid,
  disabled,
  className,
  "data-testid": testId,
  type,
  required,
  name,
  ariaDescribedby,
  slots,
  ...rest
}: TextFieldProps) {
  const { value, setValue } = useTextField({
    value: controlledValue,
    defaultValue,
    onChange,
  });

  const nativeTextValue = useNativeTextValue(value, setValue);
  const classNames = [
    "text-field",
    invalid && "text-field--invalid",
    disabled && "text-field--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const instanceId = useId();

  return (
  <Stack layout="native" className={`${classNames}`} data-testid={testId} data-fsds-component="text-field" data-fsds-box="" {...rest}>
    <label className="text-field__label" id={`${instanceId}-label`}>
      {slots?.label}
    </label>
    <input className="text-field__field" onChange={nativeTextValue.onChange} type={type} value={nativeTextValue.value} disabled={disabled} name={name} required={required} aria-invalid={invalid} aria-labelledby={slots?.label ? `${instanceId}-label` : undefined} aria-describedby={[slots?.description ? `${instanceId}-description` : null, slots?.error && invalid ? `${instanceId}-error` : null, ariaDescribedby].filter(Boolean).join(" ") || undefined} />
    <span className="text-field__description" id={`${instanceId}-description`}>
      {slots?.description}
    </span>
    <span className="text-field__error" role="alert" id={`${instanceId}-error`}>
      {slots?.error}
    </span>
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
