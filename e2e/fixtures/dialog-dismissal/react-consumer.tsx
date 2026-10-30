import { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Dialog } from "../../../packages/ds-react/src/components/Dialog/Dialog";
import { FsdsMessagesProvider } from "../../../packages/ds-react/src/primitives/messages";
import { catalog, initialState, type DialogOptions } from "./shared";
export function mountParent(target: HTMLElement, options: DialogOptions, onRequest: (value: boolean) => void) {
  let accepting = false;
  const api = { setAccepting(value: boolean) { accepting = value; },
    setOpen(_value: boolean) { throw new Error("parent not mounted"); } };
  function Parent() {
    const [state, setState] = useState(() => initialState(options));
    api.setOpen = open => setState(current => ({ ...current, open }));
    return <FsdsMessagesProvider messages={catalog}><Dialog {...state} slots={{ title: "Release dialog" }}
      onOpenChange={next => { onRequest(next); if (accepting) api.setOpen(next); }}>Dialog body</Dialog></FsdsMessagesProvider>;
  }
  const root = createRoot(target); flushSync(() => root.render(<Parent />)); return api;
}
