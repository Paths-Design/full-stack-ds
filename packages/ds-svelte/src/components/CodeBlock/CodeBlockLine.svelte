<script lang="ts">
  import type { Snippet } from "svelte";
  let { number, ending = "", children }: { number: number; ending?: string; children?: Snippet } = $props();
</script>

<span class="code-block__line"><span class="code-block__gutter" data-line={number} aria-hidden="true"></span>{@render children?.()}{ending}</span>
