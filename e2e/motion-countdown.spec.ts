import { test, expect, type Page, type Locator } from "@playwright/test";

const frameworks = ["react", "vue", "svelte", "angular", "lit"] as const;
async function configure(page: Page, props: Record<string, unknown>) {
  await page.evaluate((props) => window.postMessage({ type: "fsds:config", props, tokenCss: "" }, "*"), props);
}
async function value(bar: Locator) {
  return bar.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
}
async function mount(page: Page, framework: string) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`/preview/${framework}/Toast`);
  await page.locator("body[data-fsds-ready]").waitFor({ state: "attached" });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await configure(page, { open: true, duration: 1000, title: "Saved", variant: "success" });
  await expect(page.locator(".toast__progress")).toBeVisible();
  if (framework === "angular") {
    // The Angular preview does not install the common callback bus. Attach a
    // consumer callback through Angular's dev-mode component handle.
    await page.evaluate(() => {
      const w = window as unknown as { ng: { getComponent(el: Element): { onOpenChange?: (open: boolean) => void } }; __fsdsCallbackLog: unknown[] };
      w.__fsdsCallbackLog = [];
      w.ng.getComponent(document.querySelector("fsds-toast")!).onOpenChange = (open) => {
        w.__fsdsCallbackLog.push({ name: "onOpenChange", args: [open] });
      };
    });
  }
}

for (const framework of frameworks) {
  test(`${framework}: bottom countdown shares the budget and overlapping pause reasons`, async ({ page }) => {
    await mount(page, framework);
    const bar = page.locator(".toast__progress");
    const item = page.locator(".toast__item");
    await expect(bar).toHaveAttribute("aria-hidden", "true");
    await expect(bar).toHaveCSS("height", "2px");
    const geometry = await bar.evaluate(el => {
      const a = el.getBoundingClientRect(), b = el.parentElement!.getBoundingClientRect();
      return { bottom: b.bottom - a.bottom, width: a.width / b.width };
    });
    expect(geometry.bottom).toBeLessThanOrEqual(2);
    expect(geometry.width).toBeGreaterThan(0.95);
    await page.clock.runFor(400);
    expect(await value(bar)).toBeCloseTo(0.6, 1);
    await item.hover();
    await page.locator(".toast__close").focus();
    await page.mouse.move(5, 5);
    const paused = await value(bar);
    await page.clock.runFor(2000);
    expect(await value(bar)).toBeCloseTo(paused, 3);
    await page.locator(".toast__close").evaluate(el => (el as HTMLElement).blur());
    await page.clock.runFor(599);
    expect(await value(bar)).toBeGreaterThan(0);
    await page.clock.runFor(1);
    expect(await value(bar)).toBe(0);
    {
      const calls = await page.evaluate(() => (window as unknown as { __fsdsCallbackLog: { name: string; args: unknown[] }[] }).__fsdsCallbackLog);
      expect(calls.filter(c => c.name === "onOpenChange").map(c => c.args)).toEqual([[false]]);
    }
  });

  test(`${framework}: disabled budgets hide the bar and reduced motion preserves time`, async ({ page }) => {
    await mount(page, framework);
    const bar = page.locator(".toast__progress");
    await page.clock.runFor(450);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => value(bar)).toBe(0.6);
    await page.clock.runFor(40);
    expect(await value(bar)).toBe(0.6);
    await configure(page, { open: true, duration: null, title: "Persistent notice" });
    await expect(bar).toBeHidden();
    await page.clock.runFor(2000);
    await expect(page.locator(".toast__item")).toBeVisible();
    await configure(page, { open: true, duration: 2000, title: "New budget" });
    await expect(bar).toBeVisible();
    expect(await value(bar)).toBe(1);
    // Sample beyond the frame boundary: the last frame may precede the exact step edge.
    await page.clock.runFor(1020);
    expect(await value(bar)).toBe(0.5);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.runFor(480);
    expect(await value(bar)).toBeCloseTo(0.25, 1);
    await configure(page, { open: false, duration: 2000 });
    await expect(page.locator(".toast__item")).toHaveCount(0);
    await page.clock.runFor(2000);
  });
}
