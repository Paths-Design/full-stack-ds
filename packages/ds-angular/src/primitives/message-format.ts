/**
 * Framework-neutral message core shared by every generated package: catalog
 * shape, placeholder formatting, and default resolution. Framework bindings
 * (provider/context/DI/controller) live in `messages`.
 */
/**
 * Translations for component-owned text, keyed by component name, then by the
 * message key the component's contract declares (`{ Dialog: { close: "…" } }`).
 * Partial by design: a missing component or key falls back to the contract
 * default.
 */
export type FsdsMessageCatalog = Readonly<Record<string, Readonly<Record<string, string>> | undefined>>;

/**
 * Fill `{name}` placeholders from params. A placeholder with no param is left
 * in place so a missing value is visible rather than silently empty.
 */
export function formatFsdsMessage(template: string, params: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{([a-z][A-Za-z0-9]*)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
}

/** Overlay a component's catalog entries onto its defaults; unknown keys are ignored. */
export function resolveFsdsMessages<T extends Record<string, string>>(
  catalog: FsdsMessageCatalog | undefined,
  component: string,
  defaults: T,
): T {
  const entries = catalog?.[component];
  if (!entries) return defaults;
  let resolved = defaults;
  for (const key of Object.keys(defaults)) {
    const value = entries[key];
    if (typeof value !== "string") continue;
    if (resolved === defaults) resolved = { ...defaults };
    (resolved as Record<string, string>)[key] = value;
  }
  return resolved;
}

/** Nested providers compose: the inner catalog wins per component and key. */
export function mergeFsdsMessageCatalogs(
  outer: FsdsMessageCatalog | undefined,
  inner: FsdsMessageCatalog,
): FsdsMessageCatalog {
  if (!outer) return inner;
  const merged: Record<string, Readonly<Record<string, string>> | undefined> = { ...outer };
  for (const [component, entries] of Object.entries(inner)) {
    merged[component] = entries ? { ...outer[component], ...entries } : outer[component];
  }
  return merged;
}
