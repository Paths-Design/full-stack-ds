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

// Chrome whose side follows the reading direction sits at the inline end: the
// right in left-to-right text and the left in right-to-left text. Each probe
// renders the preview with dir set on the document element.
async function preview(page: Page, framework: string, component: string, dir: "ltr" | "rtl", props: Record<string, unknown>) {
  await page.goto(`/preview/${framework}/${component}`);
  await page.locator("body[data-fsds-ready]").waitFor();
  await page.evaluate(d => document.documentElement.setAttribute("dir", d), dir);
  await page.evaluate(p => window.postMessage({ type: "fsds:config", props: p }, "*"), props);
}

async function box(locator: Locator) {
  await expect(locator).toBeVisible();
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("no bounding box");
  return { left: rect.x, right: rect.x + rect.width, center: rect.x + rect.width / 2 };
}

/**
 * `part` is left of `whole`'s centre in right-to-left text and right of it
 * otherwise. Measured once `part` stops moving, because a position may be
 * mid-transition (the switch thumb animates its translate) and an early
 * sample could sit on either side.
 */
async function expectAtInlineEnd(part: Locator, whole: Locator, dir: "ltr" | "rtl") {
  let previous = Number.NaN;
  await expect.poll(async () => {
    const current = (await box(part)).center;
    const settled = current === previous;
    previous = current;
    return settled;
  }, { intervals: [150] }).toBe(true);
  const offset = (await box(part)).center - (await box(whole)).center;
  if (dir === "rtl") expect(offset).toBeLessThan(-2);
  else expect(offset).toBeGreaterThan(2);
}

for (const framework of ["react", "vue", "svelte", "angular", "lit"] as const) {
  for (const dir of ["ltr", "rtl"] as const) {
    test(`${framework} ${dir}: the toast region sits against the inline-end viewport edge`, async ({ page }) => {
      await preview(page, framework, "Toast", dir, { open: true, title: "Saved" });
      const toast = page.locator(".toast").first();
      const rect = await box(toast);
      const width = page.viewportSize()!.width;
      if (dir === "rtl") expect(Math.abs(rect.left)).toBeLessThanOrEqual(1);
      else expect(Math.abs(rect.right - width)).toBeLessThanOrEqual(1);
    });

    test(`${framework} ${dir}: a checked switch's thumb sits at the inline end of its track`, async ({ page }) => {
      await preview(page, framework, "Switch", dir, { checked: true, "aria-label": "Notifications", ariaLabel: "Notifications" });
      await expect(page.locator(".switch__input").first()).toBeChecked();
      await expectAtInlineEnd(page.locator(".switch__thumb").first(), page.locator(".switch__track").first(), dir);
    });

    test(`${framework} ${dir}: the dialog close button sits at the inline end of the modal`, async ({ page }) => {
      await preview(page, framework, "Dialog", dir, { open: true });
      await expectAtInlineEnd(page.locator(".dialog__closeButton").first(), page.locator(".dialog__modal").first(), dir);
    });

    test(`${framework} ${dir}: the alert dismiss button sits at the inline end of the alert`, async ({ page }) => {
      await preview(page, framework, "Alert", dir, { dismissible: true });
      // The preview shrink-wraps the alert; a consumer lays it out wider, which
      // gives the dismiss button's auto margin room to place it.
      // Lit's alert root is in a shadow tree, so its host takes the width.
      await page.addStyleTag({ content: ".alert { width: 600px; } fsds-alert { display: block; width: 600px; }" });
      await expectAtInlineEnd(page.locator(".alert__dismiss").first(), page.locator(".alert").first(), dir);
    });
  }
}
