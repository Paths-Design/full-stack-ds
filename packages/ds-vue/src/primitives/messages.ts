import {
  computed,
  defineComponent,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type PropType,
  type Ref,
} from "vue";
import { mergeFsdsMessageCatalogs, resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

export { formatFsdsMessage, mergeFsdsMessageCatalogs, resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

/** Injection key for the resolved catalog; `app.provide(FSDS_MESSAGES, ref(catalog))` also works. */
export const FSDS_MESSAGES: InjectionKey<Readonly<Ref<FsdsMessageCatalog | undefined>>> = Symbol("fsds-messages");

/**
 * Provide translated component text to descendants. Nested providers compose:
 * the inner catalog wins per component and key. Accepts a value, ref or getter
 * so a locale switch re-renders every consumer.
 */
export function provideFsdsMessages(messages: MaybeRefOrGetter<FsdsMessageCatalog>): ComputedRef<FsdsMessageCatalog> {
  const outer = inject(FSDS_MESSAGES, undefined);
  const merged = computed(() => mergeFsdsMessageCatalogs(outer?.value, toValue(messages)));
  provide(FSDS_MESSAGES, merged);
  return merged;
}

/** Component form of `provideFsdsMessages`. */
export const FsdsMessagesProvider = defineComponent({
  name: "FsdsMessagesProvider",
  props: {
    messages: { type: Object as PropType<FsdsMessageCatalog>, required: true },
  },
  setup(props, { slots }) {
    provideFsdsMessages(() => props.messages);
    return () => slots.default?.();
  },
});

/** A component's resolved messages: provided entries over contract defaults. */
export function useFsdsMessages<T extends Record<string, string>>(component: string, defaults: T): ComputedRef<T> {
  const catalog = inject(FSDS_MESSAGES, undefined);
  return computed(() => resolveFsdsMessages(catalog?.value, component, defaults));
}

/**
 * Read-through view of a component's props in which each message-defaulted
 * prop resolves `explicit value ?? catalog message`. Reads go to the
 * underlying props object, so Vue's reactivity tracking and `toRaw` are
 * unaffected.
 */
export function withFsdsMessageDefaults<P extends object>(
  props: P,
  messages: Readonly<Ref<Record<string, string>>>,
  defaults: Readonly<Partial<Record<keyof P & string, string>>>,
): P {
  return new Proxy(props, {
    get(target, key) {
      const value = Reflect.get(target, key);
      if (value !== undefined || typeof key !== "string" || !Object.prototype.hasOwnProperty.call(defaults, key)) return value;
      return messages.value[(defaults as Record<string, string>)[key]];
    },
  });
}
