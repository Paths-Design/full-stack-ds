<script lang="ts">
// @generated:start imports
import { usePageNavigator } from "./usePageNavigator.svelte.js";
import Button from "../Button/Button.svelte";
import Icon from "../Icon/Icon.svelte";
import Input from "../Input/Input.svelte";
import Pagination from "../Pagination/Pagination.svelte";
import { createReactivePagedSet } from "../../primitives/paging.svelte.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
type PageNavigatorPresentation = "indicators" | "pages";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  pages?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  presentation?: PageNavigatorPresentation;
  label?: string;
  disabled?: boolean;
  pageCount?: number;
  pageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  ofLabel?: string;
  commitLabel?: string;
  showChoices?: boolean;
  class?: string;
}

let { pages = [], index, defaultIndex = 0, onIndexChange, presentation = "indicators", label = "Page navigation", disabled = false, pageCount, pageLabel = "Current page", previousLabel = "Previous page", nextLabel = "Next page", ofLabel = "of", commitLabel = "Go", showChoices = false, class: className }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = usePageNavigator({
  index: () => index,
  defaultIndex: () => defaultIndex,
  onIndexChange: () => onIndexChange,
});
const pagedSet = createReactivePagedSet();
$effect(() => { pagedSet.sync({ index: behavior.page, items: pages,
  count: pageCount, disabled: disabled, onIndexChange: behavior.setPage }); });
$effect(() => () => pagedSet.destroy());
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "page-navigator",
    disabled ? "page-navigator--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role="group" aria-label={label} data-fsds-component="page-navigator" data-fsds-box="">
  <Button class={'page-navigator__previous'} type="button" onClick={pagedSet.previous} disabled={pagedSet.state.previousDisabled} ariaLabel={previousLabel}>
    <Icon class={'page-navigator__previousIcon'} name="arrow-left" size="sm" />
  </Button>
  <div class={'page-navigator__field'} onkeydown={pagedSet.commitOnEnter} onfocusout={pagedSet.commit}>
    <Input class={'page-navigator__input'} type="number" onChange={pagedSet.edit} value={pagedSet.state.draft} disabled={pagedSet.state.disabled} ariaLabel={pageLabel} />
  </div>
  <span class={'page-navigator__context'}>{ofLabel}</span>
  <span class={'page-navigator__total'}>{pagedSet.state.count}</span>
  <Button class={'page-navigator__commit'} type="button" onClick={pagedSet.commit} disabled={pagedSet.state.disabled} ariaLabel={commitLabel}>
    <span>{commitLabel}</span>
  </Button>
  <Button class={'page-navigator__next'} type="button" onClick={pagedSet.next} disabled={pagedSet.state.nextDisabled} ariaLabel={nextLabel}>
    <Icon class={'page-navigator__nextIcon'} name="arrow-right" size="sm" />
  </Button>
  {#if showChoices}
  <Pagination class={'page-navigator__choices'} onIndexChange={pagedSet.request} pages={pages} index={behavior.page} presentation={presentation} label={label} disabled={pagedSet.state.disabled} />
  {/if}
</div>
