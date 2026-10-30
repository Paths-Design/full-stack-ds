<script lang="ts">
  import Input from "../../../packages/ds-svelte/src/components/Input/Input.svelte";
  const { onRequest }: { onRequest: (value: string) => void } = $props();
  let value = $state("alpha");
  let accepting = $state(false);
  export function setValue(next: string) { value = next; }
  export function setAccepting(next: boolean) { accepting = next; }
</script>

<Input type="text" ariaLabel="Same mounted input" {value}
  onChange={(next) => { onRequest(next); if (accepting) value = next; }} />
