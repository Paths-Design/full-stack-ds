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
}

let { class: className, "data-testid": dataTestid, children, id, style, lang, dir, title }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(["table__body", className].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<tbody class={classes} data-testid={dataTestid} {id} {style} {lang} {dir} {title}>
  {@render children?.()}
</tbody>
