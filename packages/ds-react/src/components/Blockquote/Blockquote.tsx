// @generated:start imports
import { type BlockquoteHTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import "./Blockquote.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type BlockquoteVariant = "default" | "bordered" | "highlighted";

export type BlockquoteSize = "sm" | "md" | "lg";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface BlockquoteProps extends Omit<BlockquoteHTMLAttributes<HTMLQuoteElement>, "children" | "cite" | "className" | "data-testid" | "size" | "variant"> {
  cite?: string;
  variant?: BlockquoteVariant;
  size?: BlockquoteSize;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function Blockquote({
  variant,
  size,
  className,
  "data-testid": testId,
  children,
  cite: _cite,
  ...rest
}: BlockquoteProps) {
  const classNames = [
    "blockquote",
    variant && `blockquote--${variant}`,
    size && `blockquote--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="blockquote" className={`${classNames}`} data-testid={testId} data-fsds-component="blockquote" data-fsds-box="" {...rest}>
    {children}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
