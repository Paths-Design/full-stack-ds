import { expect, test } from "@playwright/test";
import { observe } from "./analytical-observer";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/scratch/analytical-fixtures");
  await expect(page.locator("[data-mark-row] svg").first()).toBeVisible();
});

for (const name of ["Bounded observations", "Renamed and reordered", "Two ranges", "Different endpoints", "Distinct snapshots", "Nested sharing", "Bare layer"]) {
  test(`production consumer preserves ${name}`, async ({ page }, info) => {
    await page.getByRole("button", { name, exact: true }).click();
    for (const width of [920, 1280]) {
      await page.setViewportSize({ width, height: 1800 });
      const result = await observe(page);
      expect(result.issues).toEqual([]);
      expect(result.marks.length).toBeGreaterThan(0);
      expect(result.mappings.every(m => Number.isFinite(m.zero) && m.one > m.zero)).toBe(true);
      if (name === "Two ranges" || name === "Different endpoints") {
        // Equal values across different ranges must have equal local screen coordinates.
        const sameValue = result.marks.filter(m => m.key.some(k => k.field === "site" && k.value === 1) && ["b", "d"].includes(m.field));
        expect(sameValue).toHaveLength(2);
        expect(sameValue[0].pixel).toBeCloseTo(sameValue[1].pixel, 6);
      }
      if (name === "Distinct snapshots") {
        expect(result.marks.filter(m => m.field === "a").map(m => [m.dataset, m.key.find(k => k.field === "site")!.value, Math.round(m.value)])).toEqual([
          ["d0", "1", 3], ["d1", "1", 5], ["d0", 1, 2], ["d1", 1, 4],
        ]);
      }
      if (name === "Bounded observations") {
        expect(result.panels.map(p => p.value)).toEqual(["1", 1]);
        expect(result.marks.filter(m => m.field === "a").map(m => Math.round(m.value))).toEqual([9, 10, 11]);
      }
      const screenshot = info.outputPath(`${name.replaceAll(" ", "-")}-${width}.png`);
      await page.locator("[data-composite-preview]").screenshot({ path: screenshot });
      await info.attach(`render-${width}`, { path: screenshot, contentType: "image/png" });
      await info.attach(`observation-${width}`, { body: JSON.stringify(result, null, 2), contentType: "application/json" });
    }
  });
}

const mutations = [
  ["geometry", "member geometry or association"], ["association", "view identity"],
  ["range", "range membership"], ["panel", "panel membership"], ["standing", "standing"],
  ["absent standing", "standing"], ["absent scale", "scale"], ["unreadable scale", "scale"],
  ["non-finite recovery", "member geometry or association"], ["missing mark", "range view population"],
  ["missing bounds", "missing bounds"], ["no marks", "mark population"], ["unusable transform", "unusable transform"],
] as const;
for (const [mutation, diagnostic] of mutations) {
  test(`observer rejects ${mutation}`, async ({ page }) => {
    expect((await observe(page)).issues).toEqual([]);
    await page.locator("[data-composite-preview]").evaluate((root, kind) => {
      const mark = root.querySelector("ellipse")!;
      if (kind === "geometry") mark.setAttribute("cx", String(Number(mark.getAttribute("cx")) + 2));
      if (kind === "association") mark.setAttribute("aria-label", "label");
      if (kind === "range") root.querySelector("[data-range]")!.textContent = JSON.stringify({ lower: "lo", upper: "hi", members: ["a"] });
      if (kind === "panel") root.querySelector("[data-panel-label]")!.textContent = "site: 1";
      if (kind === "standing") root.querySelector("[data-standing]")!.textContent = "Composition: retained; d0: contradicted";
      if (kind === "absent standing") root.querySelector("[data-standing]")!.remove();
      if (kind === "absent scale") root.querySelector("[data-scale]")!.remove();
      if (kind === "unreadable scale") root.querySelector("[data-scale]")!.textContent = "origin: 0; units per value: unreadable";
      if (kind === "non-finite recovery") root.querySelector("[data-scale]")!.textContent = "origin: 0; units per value: 1e-323";
      if (kind === "missing mark") mark.remove();
      if (kind === "missing bounds") root.querySelector("line")!.remove();
      if (kind === "no marks") root.querySelectorAll("[data-mark-row]").forEach(row => row.remove());
      if (kind === "unusable transform") root.querySelector("svg")!.getScreenCTM = () => null;
    }, mutation);
    expect((await observe(page)).issues).toContain(diagnostic);
  });
}

test("numerical recovery alone cannot authorize per-range auto-fitting", async ({ page }) => {
  await page.getByRole("button", { name: "Two ranges", exact: true }).click();
  expect((await observe(page)).issues).toEqual([]);
  await page.locator("[data-mark-row] svg").filter({ has: page.locator('line[aria-label="lo → hi"]') }).first().evaluate(svg => {
    const line = svg.querySelector("line")!;
    const lo = Number(line.getAttribute("x1")), hi = Number(line.getAttribute("x2")), width = hi - lo;
    svg.setAttribute("viewBox", `${lo - width / 8} 0 ${width * 1.25} 40`);
  });
  const result = await observe(page);
  expect(result.issues).toContain("shared scale distance");
  expect(result.issues).not.toContain("member geometry or association");
});

test("dataset binding swaps fail with identical keys and unchanged totals", async ({ page }) => {
  await page.getByRole("button", { name: "Distinct snapshots", exact: true }).click();
  expect((await observe(page)).issues).toEqual([]);
  await page.locator("[data-composite-preview]").evaluate(root => root.querySelectorAll("ellipse").forEach(mark => {
    mark.setAttribute("data-dataset", mark.getAttribute("data-dataset") === "d0" ? "d1" : "d0");
  }));
  expect((await observe(page)).issues).toContain("view identity");
});

test("metric limitations retain independently observable lawful readback", async ({ page }) => {
  for (const [name, status] of [["Free scale readback", "unsupported"], ["Conflicting endpoint readback", "unproven"]]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("[data-disposition]")).toHaveText("Readback: selected");
    await expect(page.locator("[data-metric-disposition]")).toContainText(`Metric: ${status}:`);
    await expect(page.locator("[data-mark-row] svg")).toHaveCount(0);
    expect((await observe(page, false)).issues).toEqual([]);
  }
});

test("failed and empty selections show disposition without lawful output", async ({ page }) => {
  for (const [name, status] of [["Contradicted bounds", "refused"], ["Unresolved quantity", "unproven"], ["Unsupported format", "unsupported"], ["Empty population", "nothing-to-realize"]]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("[data-disposition]")).toContainText(status);
    await expect(page.locator("[data-mark-row] svg")).toHaveCount(0);
    await expect(page.locator("[data-readback]")).toHaveCount(0);
  }
});
