// @generated:start imports
import { canActivateInteraction } from "../../primitives/interaction.js";
import { type HTMLAttributes, type ReactNode, useId } from "react";
import { Stack } from "../../primitives";
import { useDialog } from "./useDialog";
import "./Dialog.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface DialogProps extends Omit<HTMLAttributes<HTMLDivElement>, "ariaDescribedby" | "ariaLabel" | "ariaLabelledby" | "children" | "className" | "closeOnBackdropClick" | "closeOnEscape" | "data-testid" | "defaultOpen" | "dismissible" | "initialFocus" | "modal" | "onOpenChange" | "open" | "returnFocus" | "size"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  size?: DialogSize;
  dismissible?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  initialFocus?: string;
  returnFocus?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
  slots?: {
    footer?: ReactNode;
    title?: ReactNode;
  };
}
// @generated:end

// @generated:start subcomponents
export interface DialogHeaderProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function DialogHeader({
  children,
  className,
  "data-testid": testId,
}: DialogHeaderProps) {
  const classNames = ["dialog__header", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface DialogTitleProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function DialogTitle({
  children,
  className,
  "data-testid": testId,
}: DialogTitleProps) {
  const classNames = ["dialog__title", className].filter(Boolean).join(" ");
  return (
    <Stack as="h3" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface DialogBodyProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function DialogBody({
  children,
  className,
  "data-testid": testId,
}: DialogBodyProps) {
  const classNames = ["dialog__body", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface DialogFooterProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function DialogFooter({
  children,
  className,
  "data-testid": testId,
}: DialogFooterProps) {
  const classNames = ["dialog__footer", className].filter(Boolean).join(" ");
  return (
    <Stack variant="horizontal" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
export function Dialog({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  size = "md",
  className,
  "data-testid": testId,
  children,
  modal = true,
  dismissible = true,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  initialFocus,
  returnFocus,
  ariaLabel,
  ariaLabelledby,
  ariaDescribedby,
  slots,
  ...rest
}: DialogProps) {
  const { panelRef, openness, setOpenness, renderInPortal } = useDialog({
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    initialFocus,
    returnFocus,
    modal,
    closeOnEscape,
    closeOnBackdropClick,
  });

  const classNames = [
    "dialog",
    size && `dialog--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const instanceId = useId();

  return (
    renderInPortal(
    <Stack layout="native" className={`${classNames}`} data-testid={testId} data-fsds-component="dialog" data-fsds-box="" {...rest}>
      {openness ? (
        <div className="dialog__backdrop" aria-hidden="true" onClick={closeOnBackdropClick ? (e) => { if (e.target === e.currentTarget) setOpenness(false); } : undefined} />
      ) : null}
      {openness ? (
        <div className="dialog__modal" role="dialog" aria-modal={modal} aria-label={ariaLabel} ref={panelRef} aria-labelledby={[slots?.title && !ariaLabel ? `${instanceId}-title` : null, ariaLabelledby].filter(Boolean).join(" ") || undefined} aria-describedby={[`${instanceId}-body`, ariaDescribedby].filter(Boolean).join(" ") || undefined}>
          <div className="dialog__header">
            <h2 className="dialog__title" id={`${instanceId}-title`}>
              {slots?.title}
            </h2>
            <button className="dialog__closeButton" type="button" aria-label="Close dialog" onClick={(e) => { if (canActivateInteraction(e, false)) setOpenness(false); }} />
          </div>
          <div className="dialog__body" id={`${instanceId}-body`}>
            {children}
          </div>
          <div className="dialog__footer">
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
