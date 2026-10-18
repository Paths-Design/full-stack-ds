<script lang="ts">
  import Carousel from "../../../components/Carousel/Carousel.svelte";
  import PageNavigator from "../../../components/PageNavigator/PageNavigator.svelte";
  import { setFsdsMessages, type FsdsMessageCatalog } from "../../messages.js";

  interface Props {
    catalog?: FsdsMessageCatalog;
    subject: "carousel" | "page-navigator";
    label?: string;
    pages?: string[];
  }

  let { catalog, subject, label, pages = [] }: Props = $props();
  // A getter, so a catalog prop change reaches consumers.
  setFsdsMessages(() => catalog ?? {});
</script>

{#if subject === "carousel"}
  <Carousel slides={["one", "two"]} {label}>
    <div>one</div>
    <div>two</div>
  </Carousel>
{:else}
  <PageNavigator {pages} />
{/if}
