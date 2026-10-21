// @generated:start imports
import { type HTMLAttributes } from "react";
import { Stack } from "../../primitives";
import { useShuttle } from "./useShuttle";
import { useTransferList } from "../../primitives/hooks/useTransferList.js";
import { useFsdsMessages } from "../../primitives/messages";
import "./Shuttle.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface ShuttleProps extends Omit<HTMLAttributes<HTMLDivElement>, "ariaLabel" | "children" | "className" | "data-testid" | "defaultValue" | "onValueChange" | "options" | "value"> {
  ariaLabel?: string;
  options?: string[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
const ShuttleMessages = { availableLabel: "Available", selectedLabel: "Selected", add: "Add", remove: "Remove" };

export function Shuttle({
  value: controlledValue,
  defaultValue = ["alpha","beta","gamma"],
  onValueChange,
  className,
  "data-testid": testId,
  ariaLabel,
  options = ["alpha","beta","gamma","delta","epsilon"],
  ...rest
}: ShuttleProps) {
  const fsdsMessages = useFsdsMessages("Shuttle", ShuttleMessages);
  const { selection, setSelection } = useShuttle({
    value: controlledValue,
    defaultValue,
    onValueChange,
  });

  const transfer = useTransferList({ options: options, value: selection, onValueChange: setSelection });
  const classNames = [
    "shuttle",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} role="group" aria-label={ariaLabel} data-testid={testId} data-fsds-component="shuttle" data-fsds-box="" {...rest}>
    <ul className="shuttle__list" role="listbox" aria-multiselectable="true" data-side="available" onKeyDown={transfer.keydown} aria-label={fsdsMessages.availableLabel}>
      {(transfer.state.available ?? []).map((item, index) => (
        <li className="shuttle__item" role="option" onClick={() => transfer.toggle(item)} aria-selected={item.marked} tabIndex={item.tabIndex} data-value={item.key} key={index}>
          <span>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
    <div className="shuttle__controls">
      <button className="shuttle__add" type="button" onClick={transfer.add} disabled={transfer.state.addDisabled}>
        {fsdsMessages.add}
      </button>
      <button className="shuttle__remove" type="button" onClick={transfer.remove} disabled={transfer.state.removeDisabled}>
        {fsdsMessages.remove}
      </button>
    </div>
    <ul className="shuttle__list" role="listbox" aria-multiselectable="true" data-side="selected" onKeyDown={transfer.keydown} aria-label={fsdsMessages.selectedLabel}>
      {(transfer.state.selected ?? []).map((item, index) => (
        <li className="shuttle__item" role="option" onClick={() => transfer.toggle(item)} aria-selected={item.marked} tabIndex={item.tabIndex} data-value={item.key} key={index}>
          <span>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
