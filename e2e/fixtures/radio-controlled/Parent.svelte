<script lang="ts">
  import RadioGroup from "../../../packages/ds-svelte/src/components/RadioGroup/RadioGroup.svelte";
  const { onRequest }: { onRequest: (value: string) => void } = $props();
  let value = $state("alpha");
  let accepting = $state(false);
  const options = [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta", disabled: true },
    { value: "gamma", label: "Gamma" },
  ];
  export function setValue(next: string) { value = next; }
  export function setAccepting(next: boolean) { accepting = next; }
</script>

<RadioGroup name="same-instance-choice" ariaLabel="Same instance choice" {options} {value}
  onChange={(next) => { onRequest(next); if (accepting) value = next; }} />
