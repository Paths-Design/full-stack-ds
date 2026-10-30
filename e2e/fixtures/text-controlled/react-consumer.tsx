import { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Input } from "../../../packages/ds-react/src/components/Input/Input";
export function mountParent(target: HTMLElement, onRequest: (value: string) => void) {
  let accepting = false;
  const api = { setValue(_value: string) { throw new Error("parent not mounted"); },
    setAccepting(value: boolean) { accepting = value; } };
  function Parent() {
    const [value, setValue] = useState("alpha"); api.setValue = setValue;
    return <Input type="text" ariaLabel="Same mounted input" value={value}
      onChange={next => { onRequest(next); if (accepting) setValue(next); }} />;
  }
  const root = createRoot(target); flushSync(() => root.render(<Parent />)); return api;
}
