// @generated:start imports
import { type HTMLAttributes, type ReactNode, useId } from "react";
import { Stack } from "../../primitives";
import { Icon } from "../Icon/Icon";
import { useCommand } from "./useCommand";
import { useFsdsMessages } from "../../primitives/messages";
import "./Command.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface CommandProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "data-testid" | "defaultOpen" | "defaultSearch" | "emptyMessage" | "filter" | "label" | "onOpenChange" | "onSearchChange" | "open" | "placeholder" | "search" | "searchLabel" | "shouldFilter"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  searchLabel?: string;
  emptyMessage?: string;
  label?: string;
  shouldFilter?: boolean;
  filter?: ((value: string, search: string) => number) | undefined;
  className?: string;
  "data-testid"?: string;
  slots?: {
    items?: ReactNode;
  };
}
// @generated:end

// @generated:start subcomponents
export interface CommandListProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CommandList({
  children,
  className,
  "data-testid": testId,
}: CommandListProps) {
  const classNames = ["command__list", className].filter(Boolean).join(" ");
  return (
    <Stack as="ul" variant="horizontal" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface CommandGroupProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CommandGroup({
  children,
  className,
  "data-testid": testId,
}: CommandGroupProps) {
  const classNames = ["command__group", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface CommandGroupHeadingProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CommandGroupHeading({
  children,
  className,
  "data-testid": testId,
}: CommandGroupHeadingProps) {
  const classNames = ["command__groupHeading", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface CommandGroupItemsProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CommandGroupItems({
  children,
  className,
  "data-testid": testId,
}: CommandGroupItemsProps) {
  const classNames = ["command__groupItems", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface CommandItemProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CommandItem({
  children,
  className,
  "data-testid": testId,
}: CommandItemProps) {
  const classNames = ["command__item", className].filter(Boolean).join(" ");
  return (
    <Stack as="li" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface CommandItemIconProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CommandItemIcon({
  children,
  className,
  "data-testid": testId,
}: CommandItemIconProps) {
  const classNames = ["command__itemIcon", className].filter(Boolean).join(" ");
  return (
    <Stack as="span" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface CommandItemContentProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CommandItemContent({
  children,
  className,
  "data-testid": testId,
}: CommandItemContentProps) {
  const classNames = ["command__itemContent", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface CommandItemLabelProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CommandItemLabel({
  children,
  className,
  "data-testid": testId,
}: CommandItemLabelProps) {
  const classNames = ["command__itemLabel", className].filter(Boolean).join(" ");
  return (
    <Stack as="span" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface CommandItemDescriptionProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function CommandItemDescription({
  children,
  className,
  "data-testid": testId,
}: CommandItemDescriptionProps) {
  const classNames = ["command__itemDescription", className].filter(Boolean).join(" ");
  return (
    <Stack as="span" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
const CommandMessages = { searchPlaceholder: "Search...", searchLabel: "Search commands", emptyResults: "No results found.", dialogLabel: "Command palette" };

export function Command({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  search: controlledSearch,
  defaultSearch,
  onSearchChange,
  className,
  "data-testid": testId,
  placeholder: placeholderProp,
  searchLabel: searchLabelProp,
  emptyMessage: emptyMessageProp,
  label: labelProp,
  shouldFilter = true,
  filter,
  slots,
  ...rest
}: CommandProps) {
  const fsdsMessages = useFsdsMessages("Command", CommandMessages);
  const placeholder = placeholderProp ?? fsdsMessages.searchPlaceholder;
  const searchLabel = searchLabelProp ?? fsdsMessages.searchLabel;
  const emptyMessage = emptyMessageProp ?? fsdsMessages.emptyResults;
  const label = labelProp ?? fsdsMessages.dialogLabel;
  const { open, setOpen, search, setSearch, renderInPortal } = useCommand({
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    search: controlledSearch,
    defaultSearch,
    onSearchChange,
  });

  const classNames = [
    "command",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const instanceId = useId();

  return (
    renderInPortal(
    <Stack layout="native" className={`${classNames}`} data-testid={testId} data-fsds-component="command" data-fsds-box="" {...rest}>
      {open ? (
        <div className="command__overlay" aria-hidden="true" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} />
      ) : null}
      {open ? (
        <div className="command__dialog" role="dialog" aria-modal="true" aria-label={label}>
          <div className="command__inputWrapper">
            <Icon className="command__searchIcon" name="search" size="sm" />
            <input className="command__input" type="search" role="combobox" aria-autocomplete="list" onChange={(e) => setSearch((e.currentTarget as HTMLInputElement).value)} aria-expanded={open} aria-label={searchLabel} placeholder={placeholder} value={search} id={`${instanceId}-input`} aria-controls={`${instanceId}-list`} />
          </div>
          <div className="command__list" role="listbox" id={`${instanceId}-list`} aria-labelledby={`${instanceId}-input`}>
            <div className="command__empty" />
            {slots?.items}
            <div className="command__separator" role="separator" aria-hidden="true" />
          </div>
        </div>
      ) : null}
    </Stack>
    )
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
