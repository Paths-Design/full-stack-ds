import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Independently recover from visible table cells and actual screen geometry.
// No producer, decoder, evaluator, fixture rows or selected program imports.
async function observe(page: Page) {
  return page.locator("[data-composite-preview]").evaluate(root => {
    type Key = Array<{ field: string; value: string | number }>;
    const same = (a: Key, b: Key) => a.length === b.length && a.every(x => b.some(y => x.field === y.field && x.value === y.value));
    const issues: string[] = [];
    const tables = [...root.querySelectorAll("[data-readback] table")].map(t => {
      const fields = [...t.querySelectorAll("thead th")].slice(1).map(c => c.textContent!);
      return [...t.querySelectorAll("tbody tr")].map(r => {
        const cells = [...r.querySelectorAll("td")];
        return { key: JSON.parse(cells[0].textContent!) as Key, values: Object.fromEntries(fields.map((f, i) => [f, JSON.parse(cells[i + 1].textContent!)])) };
      });
    }).flat();
    const scale = root.querySelector("[data-scale]")?.textContent?.match(/origin: (.*); units per value: (.*)/);
    const origin = Number(scale?.[1]), factor = Number(scale?.[2]);
    const marks: Array<{ key: Key; field: string; value: number }> = [];
    const panels = [...root.querySelectorAll("[data-panel]")].map(p => {
      const label = p.querySelector("[data-panel-label]")!.textContent!;
      const delimiter = label.indexOf(": "), partition = label.slice(0, delimiter), value = JSON.parse(label.slice(delimiter + 2));
      const keys: Key[] = [];
      for (const row of p.querySelectorAll("[data-mark-row]")) {
        const key = JSON.parse(row.querySelector("[data-key]")!.textContent!) as Key;
        keys.push(key);
        if (!key.some(k => k.field === partition && k.value === value)) issues.push("panel membership");
        const readback = tables.find(r => same(r.key, key));
        if (!readback) { issues.push("identity"); continue; }
        const range = JSON.parse(row.closest("[data-range-group]")!.querySelector("[data-range]")!.textContent!);
        const svg = row.querySelector("svg")!, matrix = svg.getScreenCTM()!;
        const line = svg.querySelector("line")!, box = line.getBoundingClientRect();
        // CSS pixels -> SVG coordinates -> values. The table is a separate output.
        const valueAt = (x: number) => ((x - matrix.e) / matrix.a - origin) / factor;
        const lower = valueAt(box.left), upper = valueAt(box.right);
        if (Math.abs(lower - readback.values[range.lower]) > 1e-6 || Math.abs(upper - readback.values[range.upper]) > 1e-6) issues.push("bounds geometry");
        const fields = [...svg.querySelectorAll("ellipse")].map(mark => {
          const field = mark.getAttribute("aria-label")!;
          const b = mark.getBoundingClientRect(), value = valueAt(b.left + b.width / 2);
          if (typeof readback.values[field] !== "number" || Math.abs(value - readback.values[field]) > 1e-6) issues.push("member geometry or association");
          marks.push({ key, field, value }); return field;
        });
        if (JSON.stringify([...fields].sort()) !== JSON.stringify([...range.members].sort())) issues.push("range membership");
      }
      return { partition, value, keys };
    });
    if (tables.length !== panels.reduce((n, p) => n + p.keys.length, 0)) issues.push("population cardinality");
    const standing = root.querySelector("[data-standing]")?.textContent;
    if (standing && !/^Composition: retained; d0: qualified$/.test(standing)) issues.push("standing");
    return { issues, tables, panels, marks, standing };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/scratch/analytical-fixtures");
  await expect(page.locator("[data-composite-preview] svg").first()).toBeVisible();
});

test("actual nested geometry preserves visible values and typed panel identity", async ({ page }) => {
  const analyticalRequests: string[] = [];
  page.on("request", r => { if (r.url().includes("/analytical/")) analyticalRequests.push(r.url()); });
  await page.reload();
  await expect(page.locator("[data-composite-preview] svg").first()).toBeVisible();
  expect(analyticalRequests.some(url => /\/(projection|relation-model|relation-engine|authority|composite-selection)\.[jt]s/.test(url))).toBe(false);
  const result = await observe(page);
  expect(result.issues).toEqual([]);
  expect(result.panels.map(p => [p.value, p.keys.length])).toEqual([["1", 1], [1, 2]]);
  expect(result.marks.filter(m => m.field === "a").map(m => Math.round(m.value))).toEqual([9, 10, 11]);
  expect(result.tables.map(r => r.values.label)).toEqual(["first", "second", "third"]);
  await page.setViewportSize({ width: 1280, height: 1800 });
  expect((await observe(page)).issues).toEqual([]);
  await page.locator("[data-composite-preview]").screenshot({ path: "/private/tmp/fsds-analytical-composite.png" });
});

for (const mutation of ["geometry", "association", "range", "panel", "standing"]) {
  test(`output observation detects ${mutation} mutation`, async ({ page }) => {
    expect((await observe(page)).issues).toEqual([]);
    await page.locator("[data-composite-preview]").evaluate((root, kind) => {
      const ellipse = root.querySelector("ellipse")!;
      if (kind === "geometry") ellipse.setAttribute("cx", String(Number(ellipse.getAttribute("cx")) + 2));
      if (kind === "association") ellipse.setAttribute("aria-label", "label");
      if (kind === "range") root.querySelector("[data-range]")!.textContent = JSON.stringify({ lower: "lo", upper: "hi", members: ["a"] });
      if (kind === "panel") root.querySelector("[data-panel-label]")!.textContent = 'site: 1';
      if (kind === "standing") root.querySelector("[data-standing]")!.textContent = "Composition: retained; d0: contradicted";
    }, mutation);
    expect((await observe(page)).issues.length).toBeGreaterThan(0);
  });
}

test("renamed fields and reordered populations use the same browser consumer", async ({ page }) => {
  await page.getByRole("button", { name: "Renamed and reordered", exact: true }).click();
  const result = await observe(page);
  expect(result.issues).toEqual([]);
  expect(result.tables.map(r => r.values.first_value)).toEqual([9, 11, 10]);
  expect(result.marks.filter(m => m.field === "first_value").map(m => Math.round(m.value))).toEqual([9, 11, 10]);
  expect(result.panels.map(p => p.partition)).toEqual(["zone", "zone"]);
});

test("failed and empty selections show disposition without geometry", async ({ page }) => {
  for (const [name, status] of [["Contradicted bounds", "refused"], ["Unresolved quantity", "unproven"], ["Unsupported format", "unsupported"], ["Empty population", "nothing-to-realize"]] as const) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("[data-disposition]")).toContainText(status);
    await expect(page.locator("[data-composite-preview] svg")).toHaveCount(0);
    await expect(page.locator("[data-readback]")).toHaveCount(0);
  }
});
