// @generated:start imports
import { type HTMLAttributes, type ReactNode, useId } from "react";
import { Stack } from "../../primitives";
import { useSelect } from "./useSelect";
import "./Select.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SelectSize = "sm" | "md" | "lg";

export type SelectOption = { value: string; label: string; disabled?: boolean };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface SelectProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "data-testid" | "defaultOpen" | "defaultValue" | "disabled" | "empty" | "filterFn" | "multiple" | "onChange" | "onOpenChange" | "open" | "options" | "placeholder" | "position" | "searchLabel" | "searchable" | "size" | "triggerLabel" | "value"> {
  options?: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  multiple?: boolean;
  disabled?: boolean;
  triggerLabel?: string;
  size?: SelectSize;
  filterFn?: (option: SelectOption, searchTerm: string) => boolean;
  searchable?: boolean;
  empty?: boolean;
  placeholder?: string;
  searchLabel?: string;
  position?: string;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents
export interface SelectTriggerProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SelectTrigger({
  children,
  className,
  "data-testid": testId,
}: SelectTriggerProps) {
  const classNames = ["select__trigger", className].filter(Boolean).join(" ");
  return (
    <Stack as="button" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface SelectContentProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SelectContent({
  children,
  className,
  "data-testid": testId,
}: SelectContentProps) {
  const classNames = ["select__content", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface SelectOptionProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SelectOption({
  children,
  className,
  "data-testid": testId,
}: SelectOptionProps) {
  const classNames = ["select__option", className].filter(Boolean).join(" ");
  return (
    <Stack as="li" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
export function Select({
  value: controlledValue,
  defaultValue = "beta",
  onChange,
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  size = "md",
  position,
  disabled,
  className,
  "data-testid": testId,
  options = [{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"},{"value":"gamma","label":"Gamma"}],
  multiple,
  triggerLabel = "Select an option",
  filterFn,
  searchable,
  empty,
  placeholder = "Select an option",
  searchLabel = "Search options",
  ...rest
}: SelectProps) {
  const { panelRef, anchorRef, selection, setSelection, open, setOpen, handleTriggerKeydown, handleContentKeydown, handleOptionKeydown } = useSelect({
    value: controlledValue,
    defaultValue,
    onChange,
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    multiple,
  });

  const classNames = [
    "select",
    size && `select--${size}`,
    position && `select--${position}`,
    open && "select--open",
    disabled && "select--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const instanceId = useId();

  return (
  <Stack layout="native" className={`${classNames}`} role="combobox" aria-haspopup="listbox" aria-label={triggerLabel} aria-expanded={open} aria-disabled={disabled} aria-controls={open ? `${instanceId}-content` : undefined} data-testid={testId} data-fsds-component="select" data-fsds-box="" {...rest}>
    <button className="select__trigger" type="button" onClick={() => setOpen(!open)} onKeyDown={handleTriggerKeydown} disabled={disabled} aria-label={triggerLabel} aria-expanded={open} ref={element => { anchorRef.current = element; }} aria-controls={open ? `${instanceId}-content` : undefined}>
      <span className="select__text">
        {((options || []).filter(option => (Array.isArray(selection) ? selection : [selection]).includes(option.value)).map(option => option.label).join(', ') || placeholder)}
      </span>
    </button>
    {open ? (
      <div className="select__content" role="listbox" onKeyDown={handleContentKeydown} tabIndex={-1} ref={panelRef} id={`${instanceId}-content`}>
        {searchable ? (
          <div className="select__search">
            <input className="select__searchInput" type="text" aria-label={searchLabel} disabled={disabled} />
          </div>
        ) : null}
        <div className="select__options">
          {(options ?? []).map((item, index) => (
            <button className="select__option" role="option" type="button" onClick={() => setSelection(multiple ? ((Array.isArray(selection) ? selection : selection == null ? [] : [selection]).includes(item.value) ? (Array.isArray(selection) ? selection : selection == null ? [] : [selection]).filter((v) => v !== item.value) : [...(Array.isArray(selection) ? selection : selection == null ? [] : [selection]), item.value]) : item.value)} onKeyDown={(event) => handleOptionKeydown(event, item.value)} tabIndex={-1} aria-selected={(Array.isArray(selection) ? selection.includes(item.value) : item.value === selection)} data-value={item.value} disabled={item.disabled} aria-disabled={item.disabled} key={index}>
              <span>
                {item.label}
              </span>
            </button>
          ))}
        </div>
        {empty ? (
          <div className="select__emptyState" />
        ) : null}
      </div>
    ) : null}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
