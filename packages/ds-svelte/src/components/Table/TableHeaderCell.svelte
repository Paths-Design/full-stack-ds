<script lang="ts">
// @generated:start imports

// @generated:end

// @custom:start imports

// @custom:end

// @generated:start props
interface Props {
  class?: string;
  "data-testid"?: string;
  children?: import('svelte').Snippet;
  id?: string;
  style?: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  title?: string;
  colSpan?: number;
  rowSpan?: number;
  headers?: string;
  scope?: "col" | "row" | "colgroup" | "rowgroup";
  abbr?: string;
  ariaSort?: "none" | "ascending" | "descending" | "other";
}

let { class: className, "data-testid": dataTestid, children, id, style, lang, dir, title, colSpan, rowSpan, headers, scope, abbr, ariaSort }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(["table__headerCell", className].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<th class={classes} data-testid={dataTestid} {id} {style} {lang} {dir} {title} colspan={colSpan} rowspan={rowSpan} {headers} {scope} {abbr} aria-sort={ariaSort}>
  {@render children?.()}
</th>
