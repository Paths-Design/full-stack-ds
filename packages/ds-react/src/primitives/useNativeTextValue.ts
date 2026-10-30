import { useEffect, useRef, useState } from "react";

type TextHost = HTMLInputElement | HTMLTextAreaElement;
type TextEdit = { currentTarget: TextHost; nativeEvent: Event };

/** React restores controlled DOM values after each input event. Keep an IME
 * draft in the render value until composition commits, independently of the
 * parent-owned accepted channel. Native listeners preserve consumer handlers. */
export function useNativeTextValue(accepted: string | undefined, request: (value: string) => void) {
  const [draft, setDraft] = useState<string>();
  const pending = useRef<{ composing: boolean; dispose(): void } | undefined>(undefined);
  useEffect(() => () => { pending.current?.dispose(); pending.current = undefined; }, []);

  function onChange(event: TextEdit) {
    const target = event.currentTarget;
    if ((event.nativeEvent as InputEvent).isComposing && !pending.current?.composing) {
      pending.current?.dispose();
      const view = target.ownerDocument.defaultView;
      let frame: number | undefined;
      const record = { composing: true, dispose: () => {
        target.removeEventListener("compositionend", end);
        if (frame !== undefined) view?.cancelAnimationFrame(frame);
      } };
      const end = () => {
        record.composing = false;
        target.removeEventListener("compositionend", end);
        const finish = () => {
          if (pending.current !== record) return;
          pending.current = undefined;
          setDraft(undefined);
        };
        if (view?.requestAnimationFrame) frame = view.requestAnimationFrame(finish);
        else queueMicrotask(finish);
      };
      pending.current = record;
      target.addEventListener("compositionend", end);
    }
    if (pending.current) setDraft(target.value);
    request(target.value);
  }

  return { value: draft ?? accepted, onChange };
}
