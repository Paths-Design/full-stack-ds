// @generated:start imports
import { type ReactNode, type RefObject, useRef } from "react";
import { useControllableState, usePortal } from "../../primitives/hooks";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseWalkthroughOptions {
  /** Controlled "step" value. */
  index?: number;
  /** Initial uncontrolled "step" value. */
  defaultIndex?: number;
  /** Called when "step" changes. */
  onStepChange?: (value: number) => void;
  /** Whether "outsideClick" dismissal is enabled. */
  closeOnOutsideClick?: boolean;
}

export interface UseWalkthroughResult {
  step: number;
  setStep: (next: number) => void;
  panelRef: RefObject<HTMLDivElement | null>;
  renderInPortal: (node: ReactNode) => ReactNode;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useWalkthrough(options: UseWalkthroughOptions = {}): UseWalkthroughResult {
  const [step, setStep] = useControllableState<number>({
    controlled: options.index,
    defaultValue: options.defaultIndex ?? 0,
    onChange: options.onStepChange,
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const portal = usePortal({
    enabled: true,
  });

  return {
    step,
    setStep,
    panelRef,
    renderInPortal: portal.render,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
