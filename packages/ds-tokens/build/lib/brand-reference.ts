/** Collect referenceable token leaves, excluding group and composite fields. */
export function collectValidPaths(graph: unknown, prefix: string[] = [], out = new Set<string>()): Set<string> {
  if (typeof graph !== "object" || graph === null || Array.isArray(graph)) return out;
  if ("$value" in graph) {
    out.add(prefix.join("."));
    return out;
  }
  for (const [key, value] of Object.entries(graph)) {
    if (key.startsWith("$")) continue;
    collectValidPaths(value, [...prefix, key], out);
  }
  return out;
}

/** Brand references prefer an exact path, then implicit core and semantic roots. */
export function resolveBrandReference(reference: string, paths: ReadonlySet<string>): string | undefined {
  for (const candidate of [reference, `core.${reference}`, `semantic.${reference}`]) {
    if (paths.has(candidate)) return candidate;
  }
  return undefined;
}
