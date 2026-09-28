// @generated:start imports
import { type Ref } from "vue";
import { useControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseCarouselOptions {
  index?: () => number | undefined;
  defaultIndex?: number;
  onIndexChange?: (value: number) => void;
}

export interface UseCarouselResult {
  slide: Ref<number>;
  setSlide: (next: number) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useCarousel(options: UseCarouselOptions = {}): UseCarouselResult {
  const { value: slide, set: setSlide } = useControllableState<number>({
    controlled: options.index,
    defaultValue: options.defaultIndex ?? 0,
    onChange: options.onIndexChange,
  });

  return {
    slide,
    setSlide,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
