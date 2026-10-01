<script lang="ts">
// @generated:start imports
import { useCarousel } from "./useCarousel.svelte.js";
import Icon from "../Icon/Icon.svelte";
import Pagination from "../Pagination/Pagination.svelte";
import { createSequenceBudget } from "../../primitives/sequence-budget.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
type CarouselIndicator = "pagination" | "next" | "both";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  slides?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  autoPlay?: boolean;
  duration?: number | null;
  indicator?: CarouselIndicator;
  label?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { slides = [], index, defaultIndex = 0, onIndexChange, autoPlay = false, duration, indicator = "pagination", label = "Featured content", class: className, children }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useCarousel({
  index: () => index,
  defaultIndex: () => defaultIndex,
  onIndexChange: () => onIndexChange,
});
const sequence = createSequenceBudget({"labels":{"start":"Start slide rotation","stop":"Stop slide rotation","item":"slide"},"delegatedPicker":false,"transition":{"durationMs":250,"easing":"cubic-bezier(0.4, 0, 0.2, 1)","referenceWidth":320,"minMultiplier":0.5,"maxMultiplier":2},"parts":{"viewport":".carousel__viewport","previous":".carousel__previous","next":".carousel__next","rotation":".carousel__rotation","picker":".carousel__pagination .pagination__item"},"progress":[{"selector":".carousel__pagination .pagination__fill","effect":"elapsed-width","steps":10,"when":{"axis":"indicator","values":["pagination","both"]}},{"selector":".carousel__ring","effect":"elapsed-ring","steps":10,"when":{"axis":"indicator","values":["next","both"]}}]});
$effect(() => { sequence.sync({
  index: behavior.slide, labels: slides, autoPlay: autoPlay,
  presentation: { "indicator": indicator },
  durationMs: duration === undefined ? 6000 : duration,
  onIndexChange: behavior.setSlide,
}); });
$effect(() => () => sequence.destroy());
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "carousel",
    indicator ? `carousel--${indicator}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<section class={classes} role="region" aria-roledescription="carousel" aria-label={label} data-fsds-component="carousel" data-fsds-box="" use:sequence.bindRoot>
  <button class={'carousel__rotation'} type="button" aria-label="Start slide rotation">Start slide rotation</button>
  <div class={'carousel__viewport'} aria-live="off" aria-atomic="false">
    {@render children?.()}
  </div>
  <div class={'carousel__controls'}>
    <button class={'carousel__previous'} type="button" aria-label="Previous slide">
      <Icon name="arrow-left" size="sm" />
    </button>
    <Pagination class={'carousel__pagination'} label="Choose slide" presentation="indicators" onIndexChange={sequence.requestIndex} pages={slides} index={behavior.slide} progress={(indicator === "pagination" ? "elapsed" : (indicator === "next" ? "none" : "elapsed"))} />
    <button class={'carousel__next'} type="button" aria-label="Next slide">
      <span class={'carousel__ring'} aria-hidden="true"></span>
      <Icon name="arrow-right" size="sm" />
    </button>
  </div>
</section>
