import "../../../packages/ds-lit/src/components/Dialog/Dialog";
import { setFsdsMessages } from "../../../packages/ds-lit/src/primitives/messages";
import { catalog, initialState, type DialogOptions } from "./shared";
export function mountParent(target: HTMLElement, options: DialogOptions, onRequest: (value: boolean) => void) {
  setFsdsMessages(catalog);
  let accepting = false;
  const dialog = document.createElement("fsds-dialog") as HTMLElement & { open: boolean; onOpenChange: (value: boolean) => void };
  Object.assign(dialog, initialState(options));
  const title = document.createElement("span"); title.slot = "title"; title.textContent = "Release dialog";
  dialog.append(title, "Dialog body");
  dialog.onOpenChange = next => { onRequest(next); if (accepting) dialog.open = next; };
  target.append(dialog);
  return { setAccepting(value: boolean) { accepting = value; }, setOpen(value: boolean) { dialog.open = value; } };
}
