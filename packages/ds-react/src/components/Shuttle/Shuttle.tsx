// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { useShuttle } from "./useShuttle";
import "./Shuttle.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface ShuttleProps extends Omit<HTMLAttributes<HTMLUListElement>, "ariaLabel" | "children" | "className" | "data-testid" | "defaultValue" | "onValueChange" | "value"> {
  ariaLabel?: string;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents
export interface ShuttleItemProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function ShuttleItem({
  children,
  className,
  "data-testid": testId,
}: ShuttleItemProps) {
  const classNames = ["shuttle__item", className].filter(Boolean).join(" ");
  return (
    <Stack as="li" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
export function Shuttle({
  value: controlledValue,
  defaultValue = ["alpha","beta","gamma"],
  onValueChange,
  className,
  "data-testid": testId,
  ariaLabel,
  ...rest
}: ShuttleProps) {
  const { selection, setSelection: _setSelection } = useShuttle({
    value: controlledValue,
    defaultValue,
    onValueChange,
  });

  const classNames = [
    "shuttle",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="ul" className={`${classNames}`} role="listbox" aria-label={ariaLabel} data-testid={testId} data-fsds-component="shuttle" data-fsds-box="" {...rest}>
    {(selection ?? []).map((item, index) => (
      <li className="shuttle__item" role="option" aria-selected="true" key={index}>
        <span>
          {item}
        </span>
      </li>
    ))}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
