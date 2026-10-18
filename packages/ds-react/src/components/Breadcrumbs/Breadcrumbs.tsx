// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { useFsdsMessages } from "../../primitives/messages";
import "./Breadcrumbs.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface BreadcrumbsProps extends Omit<HTMLAttributes<HTMLElement>, "ariaLabel" | "children" | "className" | "data-testid" | "separator"> {
  ariaLabel?: string;
  separator?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents
export interface BreadcrumbsListProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function BreadcrumbsList({
  children,
  className,
  "data-testid": testId,
}: BreadcrumbsListProps) {
  const classNames = ["breadcrumbs__list", className].filter(Boolean).join(" ");
  return (
    <Stack as="ul" variant="horizontal" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface BreadcrumbsItemProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function BreadcrumbsItem({
  children,
  className,
  "data-testid": testId,
}: BreadcrumbsItemProps) {
  const classNames = ["breadcrumbs__item", className].filter(Boolean).join(" ");
  return (
    <Stack as="li" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
const BreadcrumbsMessages = { navigationLabel: "Breadcrumb" };

export function Breadcrumbs({
  className,
  "data-testid": testId,
  children,
  ariaLabel: ariaLabelProp,
  separator,
  ...rest
}: BreadcrumbsProps) {
  const fsdsMessages = useFsdsMessages("Breadcrumbs", BreadcrumbsMessages);
  const ariaLabel = ariaLabelProp ?? fsdsMessages.navigationLabel;
  const classNames = [
    "breadcrumbs",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="nav" className={`${classNames}`} aria-label={ariaLabel} data-testid={testId} data-fsds-component="breadcrumbs" data-fsds-box="" {...rest}>
    <ol className="breadcrumbs__list">
      {children}
    </ol>
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
