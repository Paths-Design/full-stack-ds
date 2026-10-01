import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { createSequenceBudget, type SequenceOptions, type SequenceTransition } from "./sequence-budget";
import { SequenceViewport } from "./sequence-motion";

/** React owns the children. This adapter only controls their native wrappers
 * and turns platform lifecycle/accessibility events into budget inputs.
 */
export function useSequence(options: Omit<SequenceOptions, "childKeys">, children: ReactNode, transition?: SequenceTransition) {
  const items = Children.toArray(children);
  const keys = items.map((item, i) => isValidElement(item) ? String(item.key ?? i) : String(i));
  const [state, setState] = useState(() => ({ index: 0, valid: false, playing: false, timed: false,
    paused: true, pending: false, elapsed: 0, reducedMotion: false, direction: 1, revision: 0 }));
  const driver = useRef<ReturnType<typeof createSequenceBudget> | null>(null);
  const rotationIntent = useRef<boolean | undefined>(undefined);
  const latest = useRef(options);
  latest.current = options;
  const identity = JSON.stringify([options.labels, keys]);
  // Re-create after StrictMode's setup/cleanup probe, never reuse a disposed clock.
  useLayoutEffect(() => {
    const current = createSequenceBudget(setState);
    driver.current = current;
    current.pause("preferences");
    if (AppState.currentState !== "active") current.pause("app-state");
    return () => { current.destroy(); if (driver.current === current) driver.current = null; };
  }, []);
  useLayoutEffect(() => {
    driver.current?.sync({ ...options, childKeys: keys, onIndexChange: value => latest.current.onIndexChange(value) });
  // Labels and keys are compared by value; render-created arrays must not restart time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.index, options.autoPlay, options.durationMs, identity]);
  useEffect(() => {
    const current = driver.current!;
    let alive = true;
    let motionEvent = false;
    let readerEvent = false;
    const subscriptions = [
      AppState.addEventListener("change", value => value === "active" ? current.resume("app-state") : current.pause("app-state")),
      AppState.addEventListener("blur", () => current.pause("app-blur")),
      AppState.addEventListener("focus", () => current.resume("app-blur")),
      AccessibilityInfo.addEventListener("reduceMotionChanged", value => { motionEvent = true; current.setReducedMotion(value); }),
      AccessibilityInfo.addEventListener("screenReaderChanged", value => { readerEvent = true; if (value) current.stop(); }),
    ];
    void Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()]).then(([motion, reader]) => {
      if (!alive) return;
      if (!motionEvent) current.setReducedMotion(motion);
      if (!readerEvent && reader) current.stop();
      current.resume("preferences");
    }, () => { if (alive) { current.stop(); current.resume("preferences"); } });
    return () => { alive = false; subscriptions.forEach(subscription => subscription.remove()); };
  }, []);
  const rotatePressIn = () => { rotationIntent.current = !driver.current?.snapshot().playing; };
  const rotate = () => { driver.current?.rotate(rotationIntent.current); rotationIntent.current = undefined; };
  const stop = () => driver.current?.stop();
  return { ...state, items, driver, transition, stop, rotate, rotatePressIn,
    next: () => driver.current?.request(driver.current.snapshot().index + 1),
    previous: () => driver.current?.request(driver.current.snapshot().index - 1),
    select: (index: number) => driver.current?.request(index),
    touchStart: () => driver.current?.pause("touch"),
    touchEnd: () => driver.current?.resume("touch"),
  };
}

export function SequenceChildren({ sequence, labels }: { sequence: ReturnType<typeof useSequence>; labels: readonly string[] }) {
  return <SequenceViewport items={sequence.items} state={sequence} labels={labels} driver={sequence.driver.current} transition={sequence.transition} />;
}
