<script module lang="ts">
// @generated:start publicTypes
export type NavTreeIconSize = "sm" | "md";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { resolveIcon } from "@full-stack-ds/iconography";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  label: string;
  href?: string;
  icon?: string;
  iconSize?: NavTreeIconSize;
  class?: string;
  children?: import('svelte').Snippet;
}

let { label, href, icon, iconSize = "sm", class: className, children }: Props = $props();
// @generated:end

// @generated:start iconGlyph
const ICON_GLYPH_SIZE_HINTS: Record<string, number> = { "sm": 16, "md": 20 };
const iconGlyphPx = $derived(ICON_GLYPH_SIZE_HINTS[iconSize]);
const iconGlyph = $derived(resolveIcon(icon ?? "", iconGlyphPx ?? Number.NaN));
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "nav-tree",
    iconSize ? `nav-tree--${iconSize}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<li class={classes} data-fsds-component="nav-tree" data-fsds-box="" role="listitem">
  <div class={'nav-tree__heading'}>
    {#if icon}
    <span class={'nav-tree__icon'} aria-hidden="true">
      {#if iconGlyph}
      <svg fill="none" xmlns="http://www.w3.org/2000/svg" data-fsds-icon={iconGlyph.name} viewBox={iconGlyph.viewBox} width={iconGlyphPx ?? iconGlyph.size} height={iconGlyphPx ?? iconGlyph.size}>
        {#each iconGlyph.paths as glyphPath, glyphIndex (glyphIndex)}
          <path d={glyphPath.d} fill={glyphPath.fill} stroke={glyphPath.stroke} stroke-width={glyphPath.strokeWidth} stroke-linecap={glyphPath.strokeLineCap} stroke-linejoin={glyphPath.strokeLineJoin} stroke-dasharray={glyphPath.strokeDasharray} fill-rule={glyphPath.fillRule} clip-rule={glyphPath.clipRule} />
        {/each}
      </svg>
      {/if}
    </span>
    {/if}
    {#if href}
    <a class={'nav-tree__headingLink'} href={href}>{label}</a>
    {/if}
    {#if !href}
    <span class={'nav-tree__headingLabel'}>{label}</span>
    {/if}
  </div>
  <ul class={'nav-tree__list'}>
    {@render children?.()}
  </ul>
</li>
