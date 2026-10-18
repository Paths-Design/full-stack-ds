// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import "./ProfileFlag.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ProfileFlagData = { id: string; username: string; full_name: string; first_name: string | null; last_name: string | null; avatar_url: string | null; bio: string; occupation: string | null; account_status: string; created_at: string; updated_at: string | null };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface ProfileFlagProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "data-testid" | "profile"> {
  profile?: ProfileFlagData;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
export function ProfileFlag({
  className,
  "data-testid": testId,
  children,
  profile: _profile,
  ...rest
}: ProfileFlagProps) {
  const classNames = [
    "profile-flag",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" className={`${classNames}`} data-testid={testId} data-fsds-component="profile-flag" data-fsds-box="" {...rest}>
    {children}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
