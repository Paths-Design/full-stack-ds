<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useCarousel } from "./useCarousel.js";
import Icon from "../Icon/Icon.vue";
import { useSequence } from "../../primitives/hooks/useSequence.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CarouselIndicator = "pagination" | "next" | "both";
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
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  slides: () => ([]),
  defaultIndex: 0,
  autoPlay: false,
  indicator: "pagination",
  label: "Featured content",
});
// @generated:end

// @generated:start hook
const behavior = useCarousel({
  index: () => props.index,
  defaultIndex: props.defaultIndex,
  onIndexChange: props.onIndexChange,
});
const sequence = useSequence({"labels":{"start":"Start slide rotation","stop":"Stop slide rotation","item":"slide"},"transition":{"durationMs":250,"easing":"cubic-bezier(0.4, 0, 0.2, 1)","referenceWidth":320,"minMultiplier":0.5,"maxMultiplier":2},"parts":{"viewport":".carousel__viewport","previous":".carousel__previous","next":".carousel__next","rotation":".carousel__rotation","picker":".carousel__picker"},"progress":[{"selector":".carousel__fill","effect":"elapsed-width","steps":10},{"selector":".carousel__ring","effect":"elapsed-ring","steps":10}]}, () => ({
  index: behavior.slide.value, labels: props.slides, autoPlay: props.autoPlay,
  durationMs: props.duration === undefined ? 6000 : props.duration,
  onIndexChange: behavior.setSlide,
}));
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "carousel",
  props.indicator ? `carousel--${props.indicator}` : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <section :class="classNames" role="region" aria-roledescription="carousel" :aria-label="props.label" :data-testid="props.dataTestid" data-fsds-component="carousel" data-fsds-box="" :ref="sequence.bindRoot">
    <button :class="'carousel__rotation'" type="button" aria-label="Start slide rotation">
      Start slide rotation
    </button>
    <div :class="'carousel__viewport'" aria-live="off" aria-atomic="false">
      <slot />
    </div>
    <div :class="'carousel__controls'">
      <button :class="'carousel__previous'" type="button" aria-label="Previous slide">
        <Icon name="arrow-left" size="sm" />
      </button>
      <div :class="'carousel__pagination'" role="group" aria-label="Choose slide">
        <button v-for="(item, index) in (props.slides ?? [])" :key="index" :class="'carousel__picker'" type="button" :aria-label="item">
          <span :class="'carousel__marker'" aria-hidden="true">
            <span :class="'carousel__fill'" aria-hidden="true"></span>
          </span>
        </button>
      </div>
      <button :class="'carousel__next'" type="button" aria-label="Next slide">
        <span :class="'carousel__ring'" aria-hidden="true"></span>
        <Icon name="arrow-right" size="sm" />
      </button>
    </div>
  </section>
</template>
