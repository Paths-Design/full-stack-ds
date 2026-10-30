export interface DialogOptions {
  dismissible?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}
export const closeLabel = "Fermer la fenêtre";
export const catalog = { Dialog: { close: closeLabel } };
export function initialState(options: DialogOptions) {
  return { ...options, open: true, ariaLabel: "Release dialog", returnFocus: "#return-target" };
}
export type DialogState = ReturnType<typeof initialState>;
