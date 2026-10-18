// @generated:start imports
import { Stack } from "../../primitives";
import { useRadioGroup } from "./useRadioGroup";
import "./RadioGroup.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type RadioGroupOption = { value: string; label: string; disabled?: boolean; description?: string };

export type RadioGroupOrientation = "vertical" | "horizontal";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface RadioGroupProps {
  options?: RadioGroupOption[];
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
  orientation?: RadioGroupOrientation;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function RadioGroup({
  value: controlledValue,
  defaultValue,
  onChange,
  orientation = "vertical",
  className,
  "data-testid": testId,
  options = [{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"}],
  name,
  ariaLabel,
  ...rest
}: RadioGroupProps) {
  const { selection, setSelection } = useRadioGroup({
    value: controlledValue,
    defaultValue,
    onChange,
  });

  const classNames = [
    "radio-group",
    orientation && `radio-group--${orientation}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="fieldset" className={`${classNames}`} role="radiogroup" aria-label={ariaLabel} data-testid={testId} data-fsds-component="radio-group" data-fsds-box="" {...rest}>
    {(options ?? []).map((item, index) => (
      <label className="radio-group__item" data-checked={(item.value === selection)} data-disabled={item.disabled} title={item.description} key={index}>
        <input className="radio-group__option" type="radio" onChange={() => setSelection(item.value)} name={name} value={item.value} checked={(item.value === selection)} disabled={item.disabled} aria-label={item.label} aria-checked={(item.value === selection)} />
        <span className="radio-group__label">
          {item.label}
        </span>
      </label>
    ))}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
