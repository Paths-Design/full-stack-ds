// @generated:start imports
import { type HTMLAttributes, type ReactNode, useEffect, useId, useState } from "react";
import { Stack } from "../../primitives";
import { useAnchoredPosition } from "../../primitives/surfaces/useAnchoredPosition";
import { useWalkthrough } from "./useWalkthrough";
import { useFsdsMessages } from "../../primitives/messages";
import "./Walkthrough.css";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type WalkthroughPlacement = "top" | "bottom" | "left" | "right" | "auto";

export type WalkthroughStepSpec = { anchor: string; title: string; description?: string };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
export interface WalkthroughProps extends Omit<HTMLAttributes<HTMLDivElement>, "autoStart" | "children" | "className" | "closeOnOutsideClick" | "data-testid" | "defaultIndex" | "index" | "label" | "nextLabel" | "onComplete" | "onNext" | "onPrevious" | "onSkip" | "onStepChange" | "placement" | "previousDisabled" | "progressLabel" | "steps" | "storageKey"> {
  steps?: WalkthroughStepSpec[];
  index?: number;
  defaultIndex?: number;
  onStepChange?: (index: number) => void;
  onComplete?: () => void;
  onSkip?: () => void;
  label?: string;
  storageKey?: string;
  autoStart?: boolean;
  closeOnOutsideClick?: boolean;
  placement?: WalkthroughPlacement;
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextLabel?: string;
  progressLabel?: string;
  className?: string;
  "data-testid"?: string;
  slots?: {
    description?: ReactNode;
    title?: ReactNode;
  };
}
// @generated:end

// @generated:start subcomponents
export interface WalkthroughContentProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function WalkthroughContent({
  children,
  className,
  "data-testid": testId,
}: WalkthroughContentProps) {
  const classNames = ["walkthrough__content", className].filter(Boolean).join(" ");
  return (
    <Stack className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface WalkthroughTitleProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function WalkthroughTitle({
  children,
  className,
  "data-testid": testId,
}: WalkthroughTitleProps) {
  const classNames = ["walkthrough__title", className].filter(Boolean).join(" ");
  return (
    <Stack as="h3" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}

export interface WalkthroughDescriptionProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function WalkthroughDescription({
  children,
  className,
  "data-testid": testId,
}: WalkthroughDescriptionProps) {
  const classNames = ["walkthrough__description", className].filter(Boolean).join(" ");
  return (
    <Stack as="p" className={classNames} data-testid={testId}>
      {children}
    </Stack>
  );
}
// @generated:end

// @generated:start component
const WalkthroughMessages = { tourLabel: "Feature tour", skip: "Skip", skipTour: "Skip tour", previous: "Previous", previousStep: "Previous step", next: "Next" };

export function Walkthrough({
  index: controlledIndex,
  defaultIndex = 0,
  onStepChange,
  placement = "auto",
  className,
  "data-testid": testId,
  steps = [{"anchor":"#step-1","title":"Welcome to the tour"},{"anchor":"#step-2","title":"Browse your dashboard"},{"anchor":"#step-3","title":"Configure preferences"}],
  onComplete: _onComplete,
  onSkip,
  label: labelProp,
  storageKey: _storageKey,
  autoStart: _autoStart = false,
  closeOnOutsideClick = false,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextLabel: nextLabelProp,
  progressLabel,
  slots,
  ...rest
}: WalkthroughProps) {
  const fsdsMessages = useFsdsMessages("Walkthrough", WalkthroughMessages);
  const label = labelProp ?? fsdsMessages.tourLabel;
  const nextLabel = nextLabelProp ?? fsdsMessages.next;
  const { step, setStep, renderInPortal } = useWalkthrough({
    index: controlledIndex,
    defaultIndex,
    onStepChange,
    closeOnOutsideClick,
  });

  const [anchoredRootEl, setAnchoredRootEl] = useState<HTMLElement | null>(null);
  const [anchorTargetEl, setAnchorTargetEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const selector = (steps ?? [])[step]?.anchor;
    setAnchorTargetEl(selector ? document.querySelector<HTMLElement>(selector) : null);
  }, [step, steps]);
  const anchoredPosition = useAnchoredPosition({
    anchor: anchorTargetEl,
    content: anchoredRootEl,
    open: true,
    placement: placement,
    collision: "flip-shift",
  });

  const classNames = [
    "walkthrough",
    placement && `walkthrough--${placement}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const instanceId = useId();

  return (
    renderInPortal(
    <Stack layout="native" className={`${classNames}`} role="status" aria-label={label} data-testid={testId} data-fsds-component="walkthrough" data-fsds-box="" ref={(el) => setAnchoredRootEl(el instanceof HTMLElement ? el : null)} data-placement={anchoredPosition.placement} style={{ position: "fixed", top: `${anchoredPosition.top}px`, left: `${anchoredPosition.left}px`, visibility: anchoredPosition.ready ? "visible" : "hidden" }} {...rest}>
      <div className="walkthrough__content" role="group" aria-labelledby={slots?.title ? `${instanceId}-title` : undefined} aria-describedby={slots?.description ? `${instanceId}-description` : undefined}>
        <h3 className="walkthrough__title" aria-label={label} id={`${instanceId}-title`}>
          {slots?.title}
        </h3>
        <p className="walkthrough__description" id={`${instanceId}-description`}>
          {slots?.description}
        </p>
      </div>
      <div className="walkthrough__controls">
        <button className="walkthrough__skip" type="button" onClick={onSkip} aria-label={fsdsMessages.skipTour}>
          {fsdsMessages.skip}
        </button>
        <button className="walkthrough__prev" type="button" onClick={onPrevious} aria-label={fsdsMessages.previousStep} disabled={previousDisabled}>
          {fsdsMessages.previous}
        </button>
        <div className="walkthrough__dots">
          {(steps ?? []).map((item, index) => <button className="walkthrough__dot" type="button" onClick={() => setStep(index)} aria-label={item.title} data-step-index={index} key={index} />)}
        </div>
        <span className="walkthrough__counter">
          {progressLabel}
        </span>
        <button className="walkthrough__next" type="button" onClick={onNext} aria-label={nextLabel}>
          {nextLabel}
        </button>
      </div>
    </Stack>
    )
  );
}
// @generated:end

// @custom:start trailing

// @custom:end
