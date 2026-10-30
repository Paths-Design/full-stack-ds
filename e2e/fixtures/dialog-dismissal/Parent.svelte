<script lang="ts">
  import Dialog from "../../../packages/ds-svelte/src/components/Dialog/Dialog.svelte";
  import { setFsdsMessages } from "../../../packages/ds-svelte/src/primitives/messages";
  import { catalog, initialState, type DialogOptions } from "./shared";
  const { options, onRequest }: { options: DialogOptions; onRequest: (value: boolean) => void } = $props();
  setFsdsMessages(() => catalog);
  let state = $state(initialState(options));
  let accepting = $state(false);
  export function setOpen(value: boolean) { state.open = value; }
  export function setAccepting(value: boolean) { accepting = value; }
</script>
{#snippet title()}Release dialog{/snippet}
<Dialog {...state} {title} onOpenChange={next => { onRequest(next); if (accepting) state.open = next; }}>Dialog body</Dialog>
