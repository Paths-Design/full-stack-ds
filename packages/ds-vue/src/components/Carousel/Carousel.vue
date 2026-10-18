<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useCarousel } from "./useCarousel.js";
import Icon from "../Icon/Icon.vue";
import Pagination from "../Pagination/Pagination.vue";
import { useSequence } from "../../primitives/hooks/useSequence.js";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
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
const fsdsProps = withDefaults(defineProps<Props>(), {
  slides: () => ([]),
  defaultIndex: 0,
  autoPlay: false,
  indicator: "pagination",
});
const CarouselMessages = { regionLabel: "Featured content", roleDescription: "carousel", rotationStart: "Start slide rotation", rotationStop: "Stop slide rotation", slideRoleDescription: "slide", slidePosition: "{index} of {count}", previousSlide: "Previous slide", nextSlide: "Next slide", chooseSlide: "Choose slide" };
const fsdsMessages = useFsdsMessages("Carousel", CarouselMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { label: "regionLabel" });
// @generated:end

// @generated:start hook
const behavior = useCarousel({
  index: () => props.index,
  defaultIndex: props.defaultIndex,
  onIndexChange: props.onIndexChange,
});
const sequence = useSequence({"delegatedPicker":false,"transition":{"durationMs":250,"easing":"cubic-bezier(0.4, 0, 0.2, 1)","referenceWidth":320,"minMultiplier":0.5,"maxMultiplier":2},"parts":{"viewport":".carousel__viewport","previous":".carousel__previous","next":".carousel__next","rotation":".carousel__rotation","picker":".carousel__pagination .pagination__item"},"progress":[{"selector":".carousel__pagination .pagination__fill","effect":"elapsed-width","steps":10,"when":{"axis":"indicator","values":["pagination","both"]}},{"selector":".carousel__ring","effect":"elapsed-ring","steps":10,"when":{"axis":"indicator","values":["next","both"]}}]}, () => ({
  index: behavior.slide.value, labels: props.slides, autoPlay: props.autoPlay,
  presentation: { "indicator": props.indicator },
  messages: { start: fsdsMessages.value.rotationStart, stop: fsdsMessages.value.rotationStop, item: fsdsMessages.value.slideRoleDescription, position: fsdsMessages.value.slidePosition },
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
  <section :class="classNames" role="region" :aria-label="props.label" :aria-roledescription="fsdsMessages.roleDescription" :data-testid="props.dataTestid" data-fsds-component="carousel" data-fsds-box="" :ref="sequence.bindRoot">
    <button :class="'carousel__rotation'" type="button"></button>
    <div :class="'carousel__viewport'" aria-live="off" aria-atomic="false">
      <slot />
    </div>
    <div :class="'carousel__controls'">
      <button :class="'carousel__previous'" type="button" :aria-label="fsdsMessages.previousSlide">
        <Icon name="arrow-left" size="sm" />
      </button>
      <Pagination :class="'carousel__pagination'" presentation="indicators" :onIndexChange="sequence.requestIndex" :label="fsdsMessages.chooseSlide" :pages="props.slides" :index="behavior.slide.value" :progress="(props.indicator === 'pagination' ? 'elapsed' : (props.indicator === 'next' ? 'none' : 'elapsed'))" />
      <button :class="'carousel__next'" type="button" :aria-label="fsdsMessages.nextSlide">
        <span :class="'carousel__ring'" aria-hidden="true"></span>
        <Icon name="arrow-right" size="sm" />
      </button>
    </div>
  </section>
</template>
