<script lang="ts">
/**
 * Test fixture for Tabs compound component.
 * Composes Tabs + TabsList + TabsTab + TabsPanel into a standard
 * two-tab setup so @testing-library/svelte can render the compound.
 */
import Tabs from "../Tabs.svelte";
import TabsList from "../TabsList.svelte";
import TabsTab from "../TabsTab.svelte";
import TabsPanel from "../TabsPanel.svelte";

interface Props {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  activationMode?: "automatic" | "manual";
  loop?: boolean;
  unmountInactive?: boolean;
  orientation?: "horizontal" | "vertical";
  /** One tab and panel per value, labelled "Tab A" / "Panel A content". */
  values?: string[];
}

let {
  defaultValue = "a",
  value,
  onValueChange,
  activationMode,
  loop,
  unmountInactive,
  orientation,
  values = ["a", "b"],
}: Props = $props();
</script>

<Tabs
  {defaultValue}
  {value}
  {onValueChange}
  {activationMode}
  {loop}
  {unmountInactive}
  {orientation}
>
  <TabsList>
    {#each values as tab (tab)}
      <TabsTab value={tab}>Tab {tab.toUpperCase()}</TabsTab>
    {/each}
  </TabsList>
  {#each values as tab (tab)}
    <TabsPanel value={tab}>Panel {tab.toUpperCase()} content</TabsPanel>
  {/each}
</Tabs>
