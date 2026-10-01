<script lang="ts">
// @generated:start imports
import { usePagination } from "./usePagination.svelte.js";
import { createReactivePagedSet } from "../../primitives/paging.svelte.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
type PaginationPresentation = "indicators" | "pages";
type PaginationProgress = "none" | "elapsed";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  pages?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  presentation?: PaginationPresentation;
  label?: string;
  disabled?: boolean;
  progress?: PaginationProgress;
  class?: string;
}

let { pages = [], index, defaultIndex = 0, onIndexChange, presentation = "indicators", label = "Choose page", disabled = false, progress = "none", class: className }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = usePagination({
  index: () => index,
  defaultIndex: () => defaultIndex,
  onIndexChange: () => onIndexChange,
});
const pagedSet = createReactivePagedSet();
$effect(() => { pagedSet.sync({ index: behavior.page, items: pages,
  count: undefined, disabled: disabled, onIndexChange: behavior.setPage }); });
$effect(() => () => pagedSet.destroy());
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "pagination",
    presentation ? `pagination--${presentation}` : null,
    progress ? `pagination--${progress}` : null,
    disabled ? "pagination--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div class={classes} role="group" aria-label={label} data-fsds-component="pagination" data-fsds-box="">
  {#each (pages ?? []) as item, index (index)}
  <button class={'pagination__item'} type="button" onclick={() => pagedSet.request(index)} aria-label={item} aria-current={(index === behavior.page)} disabled={disabled} data-current={(index === behavior.page)}>
    <span class={'pagination__marker'} aria-hidden="true">
      <span class={'pagination__fill'} aria-hidden="true"></span>
    </span>
    <span class={'pagination__label'} aria-hidden="true">{item}</span>
  </button>
  {/each}
</div>
