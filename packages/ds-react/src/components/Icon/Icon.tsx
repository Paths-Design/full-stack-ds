// @generated:start imports
import { type HTMLAttributes } from "react";
import { Stack } from "../../primitives";
import { resolveIcon } from "@full-stack-ds/iconography";
import "./Icon.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, "ariaLabel" | "children" | "className" | "data-testid" | "decorative" | "name" | "size"> {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  decorative?: boolean;
  ariaLabel?: string;
  className?: string;
  "data-testid"?: string;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
const ICON_GLYPH_SIZE_HINTS: Record<string, number> = { "sm": 16, "md": 20, "lg": 24, "xl": 32 };

export function Icon({
  size = "md",
  className,
  "data-testid": testId,
  name,
  decorative = true,
  ariaLabel,
  ...rest
}: IconProps) {
  const classNames = [
    "icon",
    size && `icon--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const iconGlyphPx = ICON_GLYPH_SIZE_HINTS[size];
  const iconGlyph = resolveIcon(name, iconGlyphPx ?? Number.NaN);

  return (
  <Stack layout="native" as="span" className={`${classNames}`} role={(decorative ? "presentation" : "img")} aria-hidden={(decorative ? "true" : "false")} aria-label={ariaLabel} data-testid={testId} data-fsds-component="icon" data-fsds-box="" {...rest}>
    {iconGlyph ? (
      <svg fill="none" xmlns="http://www.w3.org/2000/svg" data-fsds-icon={iconGlyph.name} viewBox={iconGlyph.viewBox} width={iconGlyphPx ?? iconGlyph.size} height={iconGlyphPx ?? iconGlyph.size}>
        {iconGlyph.paths.map((glyphPath, glyphIndex) => (
          <path key={glyphIndex} d={glyphPath.d} fill={glyphPath.fill} stroke={glyphPath.stroke} strokeWidth={glyphPath.strokeWidth} strokeLinecap={glyphPath.strokeLineCap} strokeLinejoin={glyphPath.strokeLineJoin} strokeDasharray={glyphPath.strokeDasharray} fillRule={glyphPath.fillRule} clipRule={glyphPath.clipRule} />
        ))}
      </svg>
    ) : null}
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
