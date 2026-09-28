// @generated:start imports
import { useControllableState } from "../../primitives/hooks";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseCarouselOptions {
  /** Controlled "slide" value. */
  index?: number;
  /** Initial uncontrolled "slide" value. */
  defaultIndex?: number;
  /** Called when "slide" changes. */
  onIndexChange?: (value: number) => void;
}

export interface UseCarouselResult {
  slide: number;
  setSlide: (next: number) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useCarousel(options: UseCarouselOptions = {}): UseCarouselResult {
  const [slide, setSlide] = useControllableState<number>({
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
