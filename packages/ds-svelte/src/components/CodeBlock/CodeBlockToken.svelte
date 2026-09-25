<script lang="ts">
  import type { Snippet } from "svelte";
  let { kind, children }: { kind: "comment" | "definition" | "keyword" | "plain" | "property" | "punctuation" | "static" | "string" | "tag"; children?: Snippet } = $props();
</script>

<span class="code-block__token" data-token={kind}>{@render children?.()}</span>
