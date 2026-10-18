<script lang="ts">
  import type { Snippet } from "svelte";
  import type { FsdsMessageCatalog } from "./message-format.js";
  import { setFsdsMessages } from "./messages.js";

  interface Props {
    messages: FsdsMessageCatalog;
    children?: Snippet;
  }

  let { messages, children }: Props = $props();
  setFsdsMessages(() => messages);
</script>

{@render children?.()}
