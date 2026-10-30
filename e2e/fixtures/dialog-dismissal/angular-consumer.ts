import { catalog, initialState, type DialogOptions, type DialogState } from "./shared";
export async function mountParent(target: HTMLElement, options: DialogOptions, onRequest: (value: boolean) => void) {
  const corePath = "@angular/core"; const platformPath = "@angular/platform-browser";
  const { Component, signal, getDebugNode, provideZonelessChangeDetection } = await import(/* @vite-ignore */ corePath);
  const { bootstrapApplication } = await import(/* @vite-ignore */ platformPath);
  const host = document.querySelector("fsds-dialog");
  const child = host && getDebugNode(host)?.componentInstance;
  if (!child) throw new Error("preview must mount the generated Dialog before its parent fixture");
  const DialogComponent = child.constructor;
  // Use the catalog module already loaded by the compiled child, including
  // the preview's cache key, so its DI token has the same identity.
  const messagePath = performance.getEntriesByType("resource").map(entry => entry.name)
    .findLast(name => /\/primitives\/messages\.(?:js|mjs|ts)$/.test(new URL(name).pathname));
  if (!messagePath) throw new Error(`compiled Dialog message provider module was not loaded; resources: ${performance.getEntriesByType("resource").map(entry => entry.name).filter(name => name.includes("message")).join(", ")}`);
  const { provideFsdsMessages } = await import(/* @vite-ignore */ messagePath);
  class Parent {
    state = signal(initialState(options)); accepting = false;
    onOpenChange = (next: boolean) => { onRequest(next); if (this.accepting) this.setOpen(next); };
    setOpen(open: boolean) { this.state.update((current: DialogState) => ({ ...current, open })); }
    setAccepting(value: boolean) { this.accepting = value; }
    setOptions(options: DialogOptions) { this.state.update((current: DialogState) => ({ ...current, ...options })); }
  }
  const flags = (["dismissible", "closeOnBackdropClick", "closeOnEscape"] as const)
    .filter(key => options[key] !== undefined).map(key => `[${key}]="state().${key}"`).join(" ");
  Component({ selector: "fsds-dialog-owner", standalone: true, imports: [DialogComponent],
    template: `<fsds-dialog [open]="state().open" [onOpenChange]="onOpenChange" [ariaLabel]="state().ariaLabel" [returnFocus]="state().returnFocus" ${flags}><span slot="title">Release dialog</span>Dialog body</fsds-dialog>`,
  })(Parent);
  target.append(document.createElement("fsds-dialog-owner"));
  const app = await bootstrapApplication(Parent, { providers: [provideZonelessChangeDetection(), provideFsdsMessages(catalog)] });
  return app.components[0].instance;
}
