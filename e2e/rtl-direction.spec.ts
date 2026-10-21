import { expect, test, type Locator, type Page } from "@playwright/test";

// A horizontal tab list follows the inline direction: in right-to-left text the
// arrow pointing toward the inline end, ArrowLeft, moves to the next tab. The
// fixture lists have two tabs and no loop, so a physical mapping would leave the
// first tab selected. The lit-in-shadow-root case nests the composition in an
// enclosing shadow root with the direction declared outside it. Angular's
// composition is proven in jsdom only: the dev server cannot compile an
// Angular fixture outside its preview pipeline.
for (const framework of ["react", "vue", "svelte", "lit", "lit-in-shadow-root"] as const) {
  test(`${framework}: in a right-to-left region, ArrowLeft selects the next tab and ArrowRight the previous`, async ({ page }) => {
    await page.goto("/");
    await page.evaluate(
      async ([url, fw]) => { (await import(/* @vite-ignore */ url)).mountFixture(fw); },
      ["/e2e/fixtures/rtl-tabs.tsx", framework] as const,
    );
    const region = page.getByRole("region", { name: `${framework} right-to-left tabs` });
    const first = region.getByRole("tab", { name: "Tab A" });
    const second = region.getByRole("tab", { name: "Tab B" });
    await expect(first).toHaveAttribute("aria-selected", "true");
    await first.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(first).toHaveAttribute("aria-selected", "false");
    await page.keyboard.press("ArrowRight");
    await expect(first).toHaveAttribute("aria-selected", "true");
  });
}

// Chrome whose side follows the reading direction sits at the inline end, the
// right in left-to-right text and the left in right-to-left text, at the same
// distance from that edge in both. Each test renders a preview, measures it
// under dir=ltr, then flips the document element to dir=rtl and measures again.
async function preview(page: Page, framework: string, component: string, props: Record<string, unknown>) {
  await page.goto(`/preview/${framework}/${component}`);
  await page.locator("body[data-fsds-ready]").waitFor();
  await page.evaluate(p => window.postMessage({ type: "fsds:config", props: p }, "*"), props);
}

async function box(locator: Locator) {
  await expect(locator).toBeVisible();
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("no bounding box");
  return { left: rect.x, right: rect.x + rect.width };
}

/** Sets the direction and waits for `part` to stop moving (the switch thumb animates). */
async function settleIn(page: Page, dir: "ltr" | "rtl", part: Locator) {
  await page.evaluate(d => document.documentElement.setAttribute("dir", d), dir);
  let previous = Number.NaN;
  await expect.poll(async () => {
    const current = (await box(part)).left;
    const settled = current === previous;
    previous = current;
    return settled;
  }, { intervals: [150] }).toBe(true);
}

/** Distance from `part` to the inline-end edge of `whole`. */
async function inlineEndGap(page: Page, dir: "ltr" | "rtl", part: Locator, whole: Locator) {
  await settleIn(page, dir, part);
  const [p, w] = [await box(part), await box(whole)];
  return dir === "rtl" ? p.left - w.left : w.right - p.right;
}

/**
 * `part` sits within `maxGap` of `whole`'s inline end in left-to-right text,
 * and at the same distance from the opposite edge in right-to-left text.
 */
async function expectMirroredAtInlineEnd(page: Page, part: Locator, whole: Locator, maxGap: number) {
  const ltr = await inlineEndGap(page, "ltr", part, whole);
  const rtl = await inlineEndGap(page, "rtl", part, whole);
  test.info().annotations.push({ type: "inline-end gap", description: `ltr ${ltr} rtl ${rtl}` });
  expect(ltr).toBeGreaterThanOrEqual(-1);
  expect(ltr).toBeLessThan(maxGap);
  expect(Math.abs(rtl - ltr)).toBeLessThanOrEqual(1);
}

for (const framework of ["react", "vue", "svelte", "angular", "lit"] as const) {
  test(`${framework}: the toast region sits against the inline-end viewport edge`, async ({ page }) => {
    await preview(page, framework, "Toast", { open: true, title: "Saved" });
    const toast = page.locator(".toast").first();
    const width = page.viewportSize()!.width;
    await settleIn(page, "ltr", toast);
    const ltr = await box(toast);
    await settleIn(page, "rtl", toast);
    const rtl = await box(toast);
    test.info().annotations.push({ type: "toast edges", description: `viewport ${width} ltr ${ltr.left}..${ltr.right} rtl ${rtl.left}..${rtl.right}` });
    expect(Math.abs(ltr.right - width)).toBeLessThanOrEqual(1);
    expect(Math.abs(rtl.left)).toBeLessThanOrEqual(1);
  });

  test(`${framework}: a checked switch's thumb sits at the inline end of its track`, async ({ page }) => {
    await preview(page, framework, "Switch", { checked: true, "aria-label": "Notifications", ariaLabel: "Notifications" });
    await expect(page.locator(".switch__input").first()).toBeChecked();
    await expectMirroredAtInlineEnd(page, page.locator(".switch__thumb").first(), page.locator(".switch__track").first(), 8);
  });

  test(`${framework}: the dialog close button sits at the inline end of the modal`, async ({ page }) => {
    await preview(page, framework, "Dialog", { open: true });
    await expectMirroredAtInlineEnd(page, page.locator(".dialog__closeButton").first(), page.locator(".dialog__modal").first(), 48);
  });

  test(`${framework}: the alert dismiss button sits at the inline end of the alert`, async ({ page }) => {
    await preview(page, framework, "Alert", { dismissible: true });
    // The preview shrink-wraps the alert; a consumer lays it out wider, which
    // gives the dismiss button's auto margin room to place it. Lit's alert root
    // is in a shadow tree, so its host takes the width.
    await page.addStyleTag({ content: ".alert { width: 600px; } fsds-alert { display: block; width: 600px; }" });
    await expectMirroredAtInlineEnd(page, page.locator(".alert__dismiss").first(), page.locator(".alert").first(), 48);
  });
}
