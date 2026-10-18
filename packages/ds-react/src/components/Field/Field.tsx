// @generated:start imports
import { type HTMLAttributes, type ReactNode, useId, useMemo } from "react";
import { Stack } from "../../primitives";
import { useField } from "./useField";
import { FieldAssociationContext } from "../../primitives/hooks";
import "./Field.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type FieldStatus = "idle" | "validating" | "valid" | "invalid";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "data-testid" | "defaultValue" | "disabled" | "id" | "name" | "onChange" | "readOnly" | "required" | "status" | "validate" | "validating" | "value"> {
  name: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  validate?: ((value: string, context: { name: string; touched: boolean; dirty: boolean }) => string | string[] | null | Promise<string | string[] | null>);
  status?: FieldStatus;
  validating?: boolean;
  className?: string;
  "data-testid"?: string;
  slots?: {
    control?: ReactNode;
    error?: ReactNode;
    help?: ReactNode;
    label?: ReactNode;
    validatingIndicator?: ReactNode;
  };
}
// @generated:end

// @generated:start subcomponents
export interface FieldHeaderProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function FieldHeader({
  children,
  className,
  "data-testid": testId,
}: FieldHeaderProps) {
  const classNames = ["field__header", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
export function Field({
  value: controlledValue,
  defaultValue,
  onChange,
  status,
  disabled,
  className,
  "data-testid": testId,
  name: _name,
  id: _id,
  required: _required,
  readOnly: _readOnly,
  validate: _validate,
  validating,
  slots,
  ...rest
}: FieldProps) {
  const { value: _value, setValue: _setValue } = useField({
    value: controlledValue,
    defaultValue,
    onChange,
  });

  const classNames = [
    "field",
    status && `field--${status}`,
    disabled && "field--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const instanceId = useId();

  const fieldAssociationValue = useMemo(
    () => ({
      controlId: `${instanceId}-control`,
      describedBy: [slots?.help && status !== "invalid" ? `${instanceId}-help` : null, slots?.error && status === "invalid" ? `${instanceId}-error` : null].filter(Boolean).join(" ") || undefined,
    }),
    [instanceId, slots?.help, status, slots?.error],
  );

  return (
  <FieldAssociationContext.Provider value={fieldAssociationValue}>
    <Stack layout="native" className={`${classNames}`} aria-labelledby={slots?.label ? `${instanceId}-label` : undefined} role="group" data-testid={testId} data-fsds-component="field" data-fsds-box="" {...rest}>
      <div className="field__header">
        <label className="field__label" id={`${instanceId}-label`} htmlFor={`${instanceId}-control`}>
          {slots?.label}
        </label>
      </div>
      <div className="field__control">
        {slots?.control}
      </div>
      <div className="field__meta">
        <span className="field__help" id={`${instanceId}-help`}>
          {slots?.help}
        </span>
        <span className="field__error" id={`${instanceId}-error`}>
          {slots?.error}
        </span>
        {validating ? (
          <span className="field__validatingIndicator">
            {slots?.validatingIndicator}
          </span>
        ) : null}
      </div>
    </Stack>
  </FieldAssociationContext.Provider>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
