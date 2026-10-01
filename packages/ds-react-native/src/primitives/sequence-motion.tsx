import { isValidElement, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, I18nManager, View } from "react-native";
import type { createSequenceBudget, SequenceSnapshot, SequenceTransition } from "./sequence-budget";

/** Stable native wrappers retain child identity. Only the active layer accepts
 * interaction; outgoing layers are presentation owned by this transition.
 */
export function SequenceViewport({ items, labels, state, driver, transition }: {
  items: ReactNode[]; labels: readonly string[]; state: SequenceSnapshot;
  driver: ReturnType<typeof createSequenceBudget> | null; transition?: SequenceTransition;
}) {
  const [width, setWidth] = useState(0);
  const [outgoing, setOutgoing] = useState<string>();
  const values = useRef(new Map<string, Animated.Value>());
  const previous = useRef<string | undefined>(undefined);
  const generation = useRef(0);
  const keys = items.map((item, index) => isValidElement(item) ? String(item.key ?? index) : String(index));
  for (const key of keys) if (!values.current.has(key)) values.current.set(key, new Animated.Value(0));
  const keySignature = JSON.stringify(keys);
  const active = keys[state.index];
  useLayoutEffect(() => {
    const owner = ++generation.current;
    const old = previous.current;
    previous.current = active;
    let animation: Animated.CompositeAnimation | undefined;
    const clockOwner = driver?.beginTransition();
    const settle = () => {
      if (generation.current !== owner) return;
      setOutgoing(undefined);
      values.current.get(active)?.setValue(0);
      if (clockOwner !== undefined) driver?.finishTransition(clockOwner);
    };
    for (const [key, value] of values.current) {
      if (!keys.includes(key)) { value.stopAnimation(); values.current.delete(key); }
    }
    const from = old === undefined ? undefined : values.current.get(old);
    const to = values.current.get(active);
    if (!old || old === active || !from || !to || !transition || width <= 0 || state.reducedMotion) {
      settle();
    } else {
      setOutgoing(old);
      const direction = state.direction * (I18nManager.isRTL ? -1 : 1);
      const multiplier = Math.min(transition.maxMultiplier, Math.max(transition.minMultiplier, Math.sqrt(width / transition.referenceWidth)));
      const points = transition.easing.match(/^cubic-bezier\(([^)]+)\)$/)?.[1].split(",").map(Number);
      const easing = points?.length === 4 ? Easing.bezier(points[0], points[1], points[2], points[3]) : Easing.linear;
      // stopAnimation returns the native presentation value. Generation checks
      // prevent a delayed callback from retargeting a newer transition.
      from.stopAnimation(fromX => {
        if (generation.current !== owner) return;
        to.stopAnimation(toX => {
          if (generation.current !== owner) return;
          from.setValue(fromX);
          to.setValue(outgoing === active ? toX : direction * width);
          const config = { duration: transition.durationMs * multiplier, easing, useNativeDriver: true };
          animation = Animated.parallel([
            Animated.timing(from, { ...config, toValue: -direction * width }),
            Animated.timing(to, { ...config, toValue: 0 }),
          ]);
          animation.start(settle);
        });
      });
    }
    return () => { generation.current = owner + 1; animation?.stop(); };
  // Values and outgoing are presentation snapshots retained across interruption.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, keySignature, state.revision, state.reducedMotion, width, transition?.durationMs, transition?.easing, transition?.referenceWidth, transition?.minMultiplier, transition?.maxMultiplier, driver]);
  useLayoutEffect(() => () => { values.current.forEach(value => value.stopAnimation()); }, []);
  return <View style={{ overflow: "hidden", position: "relative" }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {items.map((child, index) => {
      const key = keys[index];
      const selected = index === state.index;
      const visible = selected || key === outgoing;
      return <Animated.View key={key}
        style={{ display: visible ? "flex" : "none", position: selected ? "relative" : "absolute", top: 0, left: 0, width: "100%", transform: [{ translateX: values.current.get(key)! }] }}
        pointerEvents={selected ? "auto" : "none"}
        accessibilityElementsHidden={!selected}
        importantForAccessibility={selected ? "auto" : "no-hide-descendants"}
        accessibilityLabel={labels[index]}>{child}</Animated.View>;
    })}
  </View>;
}
