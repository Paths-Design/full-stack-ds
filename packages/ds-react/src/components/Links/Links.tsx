// @generated:start imports
import { canActivateInteraction } from "../../primitives/interaction.js";
import { isActivationDisabled } from "../../primitives/interaction.js";
import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import "./Links.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type LinkActivationEvent = { readonly defaultPrevented: boolean; preventDefault(): void };

export type LinkTarget = "_self" | "_blank" | "_parent" | "_top";

export type LinkSize = "small" | "medium" | "large";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface LinksProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "aria-disabled" | "children" | "className" | "data-testid" | "disabled" | "href" | "onClick" | "rel" | "role" | "size" | "tabIndex" | "target"> {
  href?: string;
  target?: LinkTarget;
  rel?: string;
  size?: LinkSize;
  disabled?: boolean;
  onClick?: (event: LinkActivationEvent) => void;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function Links({
  size,
  disabled,
  className,
  "data-testid": testId,
  children,
  href,
  target,
  rel,
  onClick,
  ...rest
}: LinksProps) {
  const classNames = [
    "links",
    size && `links--${size}`,
    disabled && "links--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="a" {...rest} className={`${classNames}`} role="link" tabIndex={0} onClick={(e) => { if (canActivateInteraction(e, false, isActivationDisabled(disabled))) (onClick)?.(e); }} href={isActivationDisabled(disabled) ? undefined : href} target={target} rel={rel} aria-disabled={disabled} data-testid={testId} data-fsds-component="links" data-fsds-box="">
    {children}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
