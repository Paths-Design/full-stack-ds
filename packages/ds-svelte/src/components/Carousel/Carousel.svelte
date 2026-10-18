<script lang="ts">
// @generated:start imports
import { useCarousel } from "./useCarousel.svelte.js";
import Icon from "../Icon/Icon.svelte";
import Pagination from "../Pagination/Pagination.svelte";
import { createSequenceBudget } from "../../primitives/sequence-budget.js";
import { useFsdsMessages } from "../../primitives/messages.js";
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

let { slides = [], index, defaultIndex = 0, onIndexChange, autoPlay = false, duration, indicator = "pagination", label: labelProp, class: className, children }: Props = $props();
const CarouselMessages = { regionLabel: "Featured content", roleDescription: "carousel", rotationStart: "Start slide rotation", rotationStop: "Stop slide rotation", slideRoleDescription: "slide", slidePosition: "{index} of {count}", previousSlide: "Previous slide", nextSlide: "Next slide", chooseSlide: "Choose slide" };
const fsdsMessages = useFsdsMessages("Carousel", CarouselMessages);
const label = $derived(labelProp ?? fsdsMessages.current.regionLabel);
// @generated:end

// @generated:start hook
const behavior = useCarousel({
  index: () => index,
  defaultIndex: () => defaultIndex,
  onIndexChange: () => onIndexChange,
});
const sequence = createSequenceBudget({"delegatedPicker":false,"transition":{"durationMs":250,"easing":"cubic-bezier(0.4, 0, 0.2, 1)","referenceWidth":320,"minMultiplier":0.5,"maxMultiplier":2},"parts":{"viewport":".carousel__viewport","previous":".carousel__previous","next":".carousel__next","rotation":".carousel__rotation","picker":".carousel__pagination .pagination__item"},"progress":[{"selector":".carousel__pagination .pagination__fill","effect":"elapsed-width","steps":10,"when":{"axis":"indicator","values":["pagination","both"]}},{"selector":".carousel__ring","effect":"elapsed-ring","steps":10,"when":{"axis":"indicator","values":["next","both"]}}]});
$effect(() => { sequence.sync({
  index: behavior.slide, labels: slides, autoPlay: autoPlay,
  presentation: { "indicator": indicator },
  messages: { start: fsdsMessages.current.rotationStart, stop: fsdsMessages.current.rotationStop, item: fsdsMessages.current.slideRoleDescription, position: fsdsMessages.current.slidePosition },
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

<section class={classes} role="region" aria-label={label} aria-roledescription={fsdsMessages.current.roleDescription} data-fsds-component="carousel" data-fsds-box="" use:sequence.bindRoot>
  <button class={'carousel__rotation'} type="button"></button>
  <div class={'carousel__viewport'} aria-live="off" aria-atomic="false">
    {@render children?.()}
  </div>
  <div class={'carousel__controls'}>
    <button class={'carousel__previous'} type="button" aria-label={fsdsMessages.current.previousSlide}>
      <Icon name="arrow-left" size="sm" />
    </button>
    <Pagination class={'carousel__pagination'} presentation="indicators" onIndexChange={sequence.requestIndex} label={fsdsMessages.current.chooseSlide} pages={slides} index={behavior.slide} progress={(indicator === "pagination" ? "elapsed" : (indicator === "next" ? "none" : "elapsed"))} />
    <button class={'carousel__next'} type="button" aria-label={fsdsMessages.current.nextSlide}>
      <span class={'carousel__ring'} aria-hidden="true"></span>
      <Icon name="arrow-right" size="sm" />
    </button>
  </div>
</section>
