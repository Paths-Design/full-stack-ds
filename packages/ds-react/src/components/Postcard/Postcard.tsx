// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import "./Postcard.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type PostcardAuthor = { name: string; handle: string; avatar: string };

export type PostcardStats = { likes: number; replies: number; reposts: number };

export type PostcardEmbed = { type: 'image' | 'video' | 'audio'; url: string; aspectRatio: { width: number; height: number } };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface PostcardProps extends Omit<HTMLAttributes<HTMLElement>, "author" | "children" | "className" | "data-testid" | "embed" | "postId" | "stats" | "timestamp" | "type"> {
  postId: string;
  author: PostcardAuthor;
  timestamp: string;
  stats: PostcardStats;
  embed?: PostcardEmbed;
  type?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents
export interface PostcardHeaderProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function PostcardHeader({
  children,
  className,
  "data-testid": testId,
}: PostcardHeaderProps) {
  const classNames = ["postcard__header", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface PostcardContentProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function PostcardContent({
  children,
  className,
  "data-testid": testId,
}: PostcardContentProps) {
  const classNames = ["postcard__content", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface PostcardFooterProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function PostcardFooter({
  children,
  className,
  "data-testid": testId,
}: PostcardFooterProps) {
  const classNames = ["postcard__footer", className].filter(Boolean).join(" ");
  return (
    <Stack variant="horizontal" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
export function Postcard({
  type,
  className,
  "data-testid": testId,
  children,
  postId: _postId,
  author,
  timestamp,
  stats,
  embed: _embed,
  ...rest
}: PostcardProps) {
  const classNames = [
    "postcard",
    type && `postcard--${type}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="article" className={`${classNames}`} data-testid={testId} data-fsds-component="postcard" data-fsds-box="" {...rest}>
    <div className="postcard__header">
      <div className="postcard__userInfo">
        <span className="postcard__displayName">
          {author.name}
        </span>
        <span className="postcard__handle">
          {author.handle}
        </span>
      </div>
      <time className="postcard__timestamp" dateTime={timestamp}>
        {timestamp}
      </time>
    </div>
    <div className="postcard__content">
      {children}
    </div>
    <div className="postcard__footer">
      <div className="postcard__stats">
        <span className="postcard__stat">
          {stats.likes}
        </span>
      </div>
    </div>
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
