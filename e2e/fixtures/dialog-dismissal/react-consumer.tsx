import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Dialog } from "../../../packages/ds-react/src/components/Dialog/Dialog";
import { FsdsMessagesProvider } from "../../../packages/ds-react/src/primitives/messages";
import { catalog, initialState, type DialogOptions } from "./shared";
export function mountParent(target: HTMLElement, options: DialogOptions, onRequest: (value: boolean) => void) {
  let accepting = false;
  const api = { setAccepting(value: boolean) { accepting = value; },
    setOptions(_options: DialogOptions) { throw new Error("parent not mounted"); },
    setOpen(_value: boolean) { throw new Error("parent not mounted"); } };
  return new Promise<typeof api>(resolve => {
  function Parent() {
    const [state, setState] = useState(() => initialState(options));
    api.setOpen = open => setState(current => ({ ...current, open }));
    api.setOptions = options => setState(current => ({ ...current, ...options }));
    useLayoutEffect(() => resolve(api), []);
    return <FsdsMessagesProvider messages={catalog}><Dialog {...state} slots={{ title: "Release dialog" }}
      onOpenChange={next => { onRequest(next); if (accepting) api.setOpen(next); }}>Dialog body</Dialog></FsdsMessagesProvider>;
  }
  createRoot(target).render(<Parent />);
  });
}
