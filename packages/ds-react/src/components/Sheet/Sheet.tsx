// @generated:start imports
import { canActivateInteraction } from "../../primitives/interaction.js";
import { type HTMLAttributes, type ReactNode, useId } from "react";
import { Stack } from "../../primitives";
import { useSheet } from "./useSheet";
import { useFsdsMessages } from "../../primitives/messages";
import "./Sheet.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type SheetSide = "top" | "right" | "bottom" | "left";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface SheetProps extends Omit<HTMLAttributes<HTMLDivElement>, "ariaDescribedby" | "ariaLabel" | "ariaLabelledby" | "children" | "className" | "data-testid" | "defaultOpen" | "modal" | "onOpenChange" | "open" | "side"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: SheetSide;
  modal?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
  slots?: {
    description?: ReactNode;
    footer?: ReactNode;
    title?: ReactNode;
  };
}
// @generated:end

// @generated:start subcomponents
export interface SheetContentProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SheetContent({
  children,
  className,
  "data-testid": testId,
}: SheetContentProps) {
  const classNames = ["sheet__content", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface SheetHeaderProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SheetHeader({
  children,
  className,
  "data-testid": testId,
}: SheetHeaderProps) {
  const classNames = ["sheet__header", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface SheetTitleProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SheetTitle({
  children,
  className,
  "data-testid": testId,
}: SheetTitleProps) {
  const classNames = ["sheet__title", className].filter(Boolean).join(" ");
  return (
    <Stack as="h3" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface SheetDescriptionProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SheetDescription({
  children,
  className,
  "data-testid": testId,
}: SheetDescriptionProps) {
  const classNames = ["sheet__description", className].filter(Boolean).join(" ");
  return (
    <Stack as="p" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface SheetBodyProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SheetBody({
  children,
  className,
  "data-testid": testId,
}: SheetBodyProps) {
  const classNames = ["sheet__body", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface SheetFooterProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SheetFooter({
  children,
  className,
  "data-testid": testId,
}: SheetFooterProps) {
  const classNames = ["sheet__footer", className].filter(Boolean).join(" ");
  return (
    <Stack variant="horizontal" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
const SheetMessages = { close: "Close sheet" };

export function Sheet({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  side = "right",
  className,
  "data-testid": testId,
  children,
  modal = true,
  ariaLabel,
  ariaLabelledby,
  ariaDescribedby,
  slots,
  ...rest
}: SheetProps) {
  const fsdsMessages = useFsdsMessages("Sheet", SheetMessages);
  const { panelRef, openness, setOpenness, renderInPortal } = useSheet({
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    modal,
  });

  const classNames = [
    "sheet",
    side && `sheet--${side}`,
    openness && "sheet--open",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const instanceId = useId();

  return (
    renderInPortal(
    <Stack layout="native" className={`${classNames}`} data-testid={testId} data-fsds-component="sheet" data-fsds-box="" {...rest}>
      {openness ? (
        <div className="sheet__overlay" aria-hidden="true" onClick={(e) => { if (e.target === e.currentTarget) setOpenness(false); }} />
      ) : null}
      {openness ? (
        <div className="sheet__content" role="dialog" aria-modal={modal} aria-label={ariaLabel} data-side={side} ref={panelRef} aria-labelledby={[slots?.title && !ariaLabel ? `${instanceId}-title` : null, ariaLabelledby].filter(Boolean).join(" ") || undefined} aria-describedby={[slots?.description ? `${instanceId}-description` : null, ariaDescribedby].filter(Boolean).join(" ") || undefined}>
          <div className="sheet__header">
            <h2 className="sheet__title" id={`${instanceId}-title`}>
              {slots?.title}
            </h2>
            <p className="sheet__description" id={`${instanceId}-description`}>
              {slots?.description}
            </p>
            <button className="sheet__close" type="button" onClick={(e) => { if (canActivateInteraction(e, false)) setOpenness(false); }} aria-label={fsdsMessages.close} />
          </div>
          <div className="sheet__body">
            {children}
          </div>
          <div className="sheet__footer">
            {slots?.footer}
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
