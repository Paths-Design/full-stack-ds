import { createElement, type ReactNode } from "react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type HostProps = Record<string, unknown> & { children?: ReactNode };

function host(name: string) {
  return function HostComponent({ children, ...props }: HostProps) {
    return createElement(name, props, children);
  };
}

export const View = host("View");
export const Text = host("Text");
export const Pressable = host("Pressable");
export const TextInput = host("TextInput");
export const Image = host("Image");
export const Switch = host("Switch");
export const Modal = host("Modal");
export const GestureResponderEvent = undefined;
export const I18nManager = { isRTL: false };
export const Easing = { linear: (value: number) => value, bezier: () => (value: number) => value };
class AnimatedValue {
  constructor(public value: number) {}
  setValue(value: number) { this.value = value; }
  stopAnimation(callback?: (value: number) => void) { callback?.(this.value); }
}
const nativeMotions: { value: AnimatedValue; config: { toValue: number; duration: number } }[] = [];
export const Animated = {
  View,
  Value: AnimatedValue,
  motions: nativeMotions,
  timing(value: AnimatedValue, config: { toValue: number; duration: number }) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
      start(done?: () => void) {
        nativeMotions.push({ value, config });
        timer = setTimeout(() => { value.setValue(config.toValue); done?.(); }, config.duration);
      },
      stop() { clearTimeout(timer); },
    };
  },
  parallel(animations: { start(done: () => void): void; stop(): void }[]) {
    return {
      start(done: () => void) {
        let left = animations.length;
        animations.forEach(animation => animation.start(() => { if (--left === 0) done(); }));
      },
      stop() { animations.forEach(animation => animation.stop()); },
    };
  },
};

function eventSource<T>() {
  const listeners = new Map<string, Set<(value: T) => void>>();
  return {
    addEventListener(name: string, listener: (value: T) => void) {
      let bucket = listeners.get(name);
      if (!bucket) listeners.set(name, bucket = new Set());
      bucket.add(listener);
      return { remove: () => bucket.delete(listener) };
    },
    emit(name: string, value: T) { listeners.get(name)?.forEach(listener => listener(value)); },
    listenerCount() { return [...listeners.values()].reduce((sum, bucket) => sum + bucket.size, 0); },
  };
}

export const AppState = { ...eventSource<string>(), currentState: "active" };
export const AccessibilityInfo = {
  ...eventSource<boolean>(),
  isReduceMotionEnabled: async () => false,
  isScreenReaderEnabled: async () => false,
};

type BackListener = () => boolean | null | undefined;
const backListeners = new Set<BackListener>();

/**
 * Records hardwareBackPress listeners. `press()` mirrors the platform: the
 * newest listener runs first and the first to return true consumes the press.
 * Returns whether any listener consumed it.
 */
export const BackHandler = {
  addEventListener(_event: "hardwareBackPress", listener: BackListener) {
    backListeners.add(listener);
    return { remove: () => backListeners.delete(listener) };
  },
  press(): boolean {
    return [...backListeners].reverse().some((listener) => listener() === true);
  },
  listenerCount(): number {
    return backListeners.size;
  },
};

export const StyleSheet = {
  create<T extends Record<string, unknown>>(styles: T): T {
    return styles;
  },
};
