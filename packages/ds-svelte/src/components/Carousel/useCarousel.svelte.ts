// @generated:start imports
import { createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseCarouselOptions {
  index?: () => number | undefined;
  defaultIndex?: () => number | undefined;
  onIndexChange?: () => ((value: number) => void) | undefined;
}

export interface UseCarouselResult {
  readonly slide: number;
  setSlide(next: number): void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useCarousel(opts: UseCarouselOptions = {}): UseCarouselResult {
  const slideState = createControllableState<number>({
    controlled: opts.index,
    defaultValue: opts.defaultIndex?.() ?? 0,
    onChange: (v) => opts.onIndexChange?.()?.(v),
  });

  return {
    get slide() { return slideState.value; },
    setSlide(v) { slideState.set(v); },
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
