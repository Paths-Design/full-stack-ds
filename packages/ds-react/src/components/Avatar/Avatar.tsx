// @generated:start imports
import { type HTMLAttributes } from "react";
import { Stack } from "../../primitives";
import { Image } from "../Image/Image";
import "./Avatar.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface AvatarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "data-testid" | "initials" | "name" | "priority" | "size" | "src"> {
  src?: string;
  name: string;
  initials?: string;
  priority?: boolean;
  size?: string;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function Avatar({
  size,
  className,
  "data-testid": testId,
  src,
  name,
  initials,
  priority: _priority,
  ...rest
}: AvatarProps) {
  const classNames = [
    "avatar",
    size && `avatar--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} aria-label={name} role="img" data-testid={testId} data-fsds-component="avatar" data-fsds-box="" {...rest}>
    {src ? (
      <Image className="avatar__image" src={src} alt={""} />
    ) : null}
    {initials ? (
      <span className="avatar__initials">
        {initials}
      </span>
    ) : null}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
