// @generated:start imports
import { type HTMLAttributes, type ReactNode } from "react";
import { Stack } from "../../primitives";
import { Icon } from "../Icon/Icon";
import { Pagination } from "../Pagination/Pagination";
import { useCarousel } from "./useCarousel";
import { useSequence } from "../../primitives/hooks/useSequence.js";
import { useFsdsMessages } from "../../primitives/messages";
import "./Carousel.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CarouselIndicator = "pagination" | "next" | "both";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface CarouselProps extends Omit<HTMLAttributes<HTMLElement>, "autoPlay" | "children" | "className" | "data-testid" | "defaultIndex" | "duration" | "index" | "indicator" | "label" | "onIndexChange" | "slides"> {
  slides?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  autoPlay?: boolean;
  duration?: number | null;
  indicator?: CarouselIndicator;
  label?: string;
  className?: string;
  "data-testid"?: string;
  children?: ReactNode;
}
// @generated:end

// @generated:start subcomponents

// @generated:end

// @generated:start component
const CarouselMessages = { regionLabel: "Featured content", roleDescription: "carousel", rotationStart: "Start slide rotation", rotationStop: "Stop slide rotation", slideRoleDescription: "slide", slidePosition: "{index} of {count}", previousSlide: "Previous slide", nextSlide: "Next slide", chooseSlide: "Choose slide" };

export function Carousel({
  index: controlledIndex,
  defaultIndex = 0,
  onIndexChange,
  indicator = "pagination",
  className,
  "data-testid": testId,
  children,
  slides = [],
  autoPlay = false,
  duration,
  label: labelProp,
  ...rest
}: CarouselProps) {
  const fsdsMessages = useFsdsMessages("Carousel", CarouselMessages);
  const label = labelProp ?? fsdsMessages.regionLabel;
  const { slide, setSlide } = useCarousel({
    index: controlledIndex,
    defaultIndex,
    onIndexChange,
  });

  const sequence = useSequence({"delegatedPicker":false,"transition":{"durationMs":250,"easing":"cubic-bezier(0.4, 0, 0.2, 1)","referenceWidth":320,"minMultiplier":0.5,"maxMultiplier":2},"parts":{"viewport":".carousel__viewport","previous":".carousel__previous","next":".carousel__next","rotation":".carousel__rotation","picker":".carousel__pagination .pagination__item"},"progress":[{"selector":".carousel__pagination .pagination__fill","effect":"elapsed-width","steps":10,"when":{"axis":"indicator","values":["pagination","both"]}},{"selector":".carousel__ring","effect":"elapsed-ring","steps":10,"when":{"axis":"indicator","values":["next","both"]}}]}, {
    index: slide, labels: slides, autoPlay: autoPlay,
    presentation: { "indicator": indicator },
    messages: { start: fsdsMessages.rotationStart, stop: fsdsMessages.rotationStop, item: fsdsMessages.slideRoleDescription, position: fsdsMessages.slidePosition },
    durationMs: duration === undefined ? 6000 : duration,
    onIndexChange: setSlide,
  });
  const classNames = [
    "carousel",
    indicator && `carousel--${indicator}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
  <Stack layout="native" as="section" className={`${classNames}`} role="region" aria-label={label} aria-roledescription={fsdsMessages.roleDescription} data-testid={testId} data-fsds-component="carousel" data-fsds-box="" ref={sequence.bindRoot} {...rest}>
    <button className="carousel__rotation" type="button" />
    <div className="carousel__viewport" aria-live="off" aria-atomic="false">
      {children}
    </div>
    <div className="carousel__controls">
      <button className="carousel__previous" type="button" aria-label={fsdsMessages.previousSlide}>
        <Icon name="arrow-left" size="sm" />
      </button>
      <Pagination className="carousel__pagination" presentation="indicators" onIndexChange={sequence.requestIndex} label={fsdsMessages.chooseSlide} pages={slides} index={slide} progress={(indicator === "pagination" ? "elapsed" : (indicator === "next" ? "none" : "elapsed"))} />
      <button className="carousel__next" type="button" aria-label={fsdsMessages.nextSlide}>
        <span className="carousel__ring" aria-hidden="true" />
        <Icon name="arrow-right" size="sm" />
      </button>
    </div>
  </Stack>
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
