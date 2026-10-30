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
}

let { class: className, "data-testid": dataTestid, children, id, style, lang, dir, title, colSpan, rowSpan, headers }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(["table__cell", className].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<td class={classes} data-testid={dataTestid} {id} {style} {lang} {dir} {title} colspan={colSpan} rowspan={rowSpan} {headers}>
  {@render children?.()}
</td>
