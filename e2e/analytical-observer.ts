import type { Page } from "@playwright/test";

// Observations come only from visible readback, binding labels and screen geometry.
// This oracle imports no producer, artifact decoder, evaluator or fixture data.
export async function observe(page: Page, metric = true) {
  return page.locator("[data-composite-preview]").evaluate((root, requireMetric) => {
    type Key = Array<{ field: string; value: string | number }>;
    const issues: string[] = [];
    const identity = (key: Key) => JSON.stringify([...key].sort((a, b) => a.field.localeCompare(b.field)));
    const visible = (element: Element | null | undefined) => {
      if (!element || element.getClientRects().length === 0) return false;
      for (let e: Element | null = element; e; e = e.parentElement) {
        const style = getComputedStyle(e);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      }
      return true;
    };
    const text = (element: Element | null | undefined, label: string) => {
      if (!visible(element) || !element?.textContent?.trim()) { issues.push(label); return ""; }
      return element.textContent.trim();
    };
    const parse = <T,>(value: string, label: string): T | undefined => {
      try { return JSON.parse(value) as T; } catch { issues.push(label); return undefined; }
    };
    const tables = [...root.querySelectorAll("[data-readback]")].flatMap(container => {
      const dataset = text(container.querySelector("[data-dataset-label]"), "dataset identity");
      const fields = [...container.querySelectorAll("thead th")].slice(1).map(c => text(c, "readback fields"));
      return [...container.querySelectorAll("tbody tr")].flatMap(row => {
        const cells = [...row.querySelectorAll("td")];
        const key = parse<Key>(text(cells[0], "grain identity"), "grain identity");
        if (!Array.isArray(key) || key.some(k => !k || typeof k.field !== "string" || !["string", "number"].includes(typeof k.value))) { issues.push("grain identity"); return []; }
        const values = Object.fromEntries(fields.map((field, i) => {
          const value = text(cells[i + 1], "readback value");
          return [field, value === "uncarried" ? undefined : parse<unknown>(value, "readback value")];
        }));
        return [{ dataset, key, values }];
      });
    });
    const datasets = [...root.querySelectorAll("[data-dataset-label]")].map(e => text(e, "dataset identity"));
    if (!datasets.length || new Set(datasets).size !== datasets.length || !tables.length) issues.push("readback population");
    const standing = text(root.querySelector("[data-standing]"), "standing");
    if (standing !== `Composition: retained; ${datasets.map(d => `${d}: qualified`).join("; ")}`) issues.push("standing");
    const bindings = [...root.querySelectorAll("[data-bindings] tbody tr")].map(row => {
      const [view, dataset, field, lower, upper] = [...row.querySelectorAll("td")].map(e => text(e, "view binding"));
      if (!datasets.includes(dataset)) issues.push("view dataset");
      return { view, dataset, field, lower, upper };
    });
    if (!bindings.length || new Set(bindings.map(b => b.view)).size !== bindings.length) issues.push("view bindings");
    const marks: Array<{ dataset: string; view: string; key: Key; field: string; value: number; pixel: number }> = [];
    const mappings: Array<{ zero: number; one: number }> = [];
    const panels = [...root.querySelectorAll("[data-panel]")].map(panel => {
      const label = text(panel.querySelector(":scope > [data-panel-label]"), "panel label");
      const split = label.indexOf(": "), partition = label.slice(0, split);
      return { panel, partition, value: parse<string | number>(label.slice(split + 2), "panel label") };
    });
    if (requireMetric) {
      const scale = text(root.querySelector("[data-scale]"), "scale").match(/^origin: (.+); units per value: (.+)$/);
      const origin = Number(scale?.[1]), factor = Number(scale?.[2]);
      const usableScale = Number.isFinite(origin) && Number.isFinite(factor) && factor > 0;
      if (!usableScale) issues.push("scale");
      const close = (actual: number, expected: unknown, label: string, tolerance = 1e-6) => {
        if (!Number.isFinite(actual) || !Number.isFinite(tolerance) || typeof expected !== "number" || !Number.isFinite(expected) || Math.abs(actual - expected) > tolerance) issues.push(label);
      };
      const seen: string[] = [];
      for (const row of root.querySelectorAll("[data-mark-row]")) {
        const key = parse<Key>(text(row.querySelector("[data-key]"), "mark identity"), "mark identity");
        if (!Array.isArray(key)) { issues.push("mark identity"); continue; }
        for (const panel of panels.filter(p => p.panel.contains(row))) if (!key.some(k => k.field === panel.partition && k.value === panel.value)) issues.push("panel membership");
        const group = row.closest("[data-range-group]")!;
        const range = parse<{ lower: string; upper: string; members: string[] }>(text(group?.querySelector("[data-range]"), "range"), "range");
        const svg = row.querySelector("svg"), matrix = svg?.getScreenCTM();
        const viewBox = svg?.viewBox.baseVal;
        if (!visible(svg) || !matrix || ![matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].every(Number.isFinite) || matrix.a <= 0 || matrix.d <= 0 || matrix.b !== 0 || matrix.c !== 0 || !viewBox || ![viewBox.x, viewBox.y, viewBox.width, viewBox.height].every(Number.isFinite) || viewBox.width <= 0 || viewBox.height <= 0) { issues.push("unusable transform"); continue; }
        if (!usableScale || !range || !Array.isArray(range.members)) { issues.push("unavailable metric observation"); continue; }
        const left = svg!.getBoundingClientRect().left;
        mappings.push({ zero: origin * matrix.a + matrix.e - left, one: (origin + factor) * matrix.a + matrix.e - left });
        const valueAt = (x: number) => ((x - matrix.e) / matrix.a - origin) / factor;
        // Bounding boxes round in screen space; allow 1/1024 CSS pixel, converted
        // through the observed scale instead of assuming fixed data-unit precision.
        const valueTolerance = 1 / (1024 * matrix.a * factor);
        const candidates = bindings.filter(b => b.view.split(".").slice(0, -1).join(".") === group.getAttribute("data-layer") && b.lower === range.lower && b.upper === range.upper);
        if (JSON.stringify([...new Set(candidates.map(b => b.field))].sort()) !== JSON.stringify([...range.members].sort())) issues.push("range membership");
        const lines = [...svg!.querySelectorAll("line")];
        if (lines.length !== 1 || !visible(lines[0])) issues.push("missing bounds");
        else {
          const line = lines[0], dataset = line.getAttribute("data-dataset");
          const source = tables.find(r => r.dataset === dataset && identity(r.key) === identity(key));
          if (!source || !candidates.some(b => b.dataset === dataset)) issues.push("bounds identity");
          else { const box = line.getBoundingClientRect(); close(valueAt(box.left), source.values[range.lower], "bounds geometry", valueTolerance); close(valueAt(box.right), source.values[range.upper], "bounds geometry", valueTolerance); }
        }
        const inRow: string[] = [];
        for (const mark of svg!.querySelectorAll("ellipse")) {
          const view = mark.getAttribute("data-view") ?? "", dataset = mark.getAttribute("data-dataset") ?? "", field = mark.getAttribute("aria-label") ?? "";
          const binding = candidates.find(b => b.view === view);
          if (!binding || binding.dataset !== dataset || binding.field !== field) issues.push("view identity");
          const source = tables.find(r => r.dataset === dataset && identity(r.key) === identity(key));
          const box = mark.getBoundingClientRect(), pixel = box.left + box.width / 2 - left, value = valueAt(box.left + box.width / 2);
          if (!visible(mark) || box.width <= 0 || box.height <= 0) issues.push("missing mark");
          close(value, source?.values[field], "member geometry or association", valueTolerance);
          marks.push({ dataset, view, key, field, value, pixel });
          seen.push(JSON.stringify([view, dataset, identity(key)])); inRow.push(view);
        }
        if (JSON.stringify(inRow.sort()) !== JSON.stringify(candidates.map(b => b.view).sort())) issues.push("range view population");
      }
      const expected = bindings.flatMap(b => tables.filter(r => r.dataset === b.dataset).map(r => JSON.stringify([b.view, b.dataset, identity(r.key)])));
      if (!seen.length || JSON.stringify(seen.sort()) !== JSON.stringify(expected.sort())) issues.push("mark population");
      if (!mappings.length) issues.push("shared scale unavailable");
      for (const mapping of mappings) {
        close(mapping.zero, mappings[0].zero, "shared scale origin");
        close(mapping.one - mapping.zero, mappings[0].one - mappings[0].zero, "shared scale distance");
      }
    }
    return { issues: [...new Set(issues)], tables, bindings, marks, mappings, standing, panels: panels.map(({ partition, value }) => ({ partition, value })) };
  }, metric);
}
