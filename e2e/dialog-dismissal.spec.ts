import { expect, test, type Page } from "@playwright/test";
import { closeLabel, type DialogOptions } from "./fixtures/dialog-dismissal/shared";

async function mount(page: Page, framework: string, options: DialogOptions = {}) {
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  await page.goto(`/preview/${framework}/Dialog`);
  await page.locator("body[data-fsds-ready]").waitFor();
  await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", { data: { type: "fsds:config", props: { open: false } } })));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(async ({ framework, options }) => {
    await new Promise(requestAnimationFrame);
    const button = document.createElement("button"); button.id = "return-target"; button.textContent = "Return target";
    document.body.append(button); button.focus();
    const target = document.createElement("div"); target.id = "dialog-owner"; document.body.append(target);
    const path = `/e2e/fixtures/dialog-dismissal/${framework}-consumer.${framework === "react" ? "tsx" : "ts"}`;
    const { mountParent } = await import(path);
    const state = window as unknown as { dialogRequests: boolean[]; dialogParent: { setAccepting(value: boolean): void; setOpen(value: boolean): void } };
    state.dialogRequests = []; state.dialogParent = await mountParent(target, options, (value: boolean) => state.dialogRequests.push(value));
  }, { framework, options });
  await expect(page.getByRole("dialog", { name: "Release dialog", exact: true })).toBeVisible();
}
const requests = (page: Page) => page.evaluate(() => (window as unknown as { dialogRequests: boolean[] }).dialogRequests);
async function backdropClick(page: Page) {
  const backdrop = page.locator(".dialog__backdrop:visible"); await expect(backdrop).toHaveCount(1);
  await backdrop.evaluate(element => {
    (window as unknown as { clickedBackdrop: boolean }).clickedBackdrop = false;
    element.addEventListener("click", event => { (window as unknown as { clickedBackdrop: boolean }).clickedBackdrop = event.target === element; }, { once: true });
  });
  await backdrop.click({ position: { x: 5, y: 5 } });
  expect(await page.evaluate(() => (window as unknown as { clickedBackdrop: boolean }).clickedBackdrop)).toBe(true);
}

for (const framework of ["react", "vue", "svelte", "angular", "lit"]) {
  test(`${framework}: mounted policy updates govern Escape and backdrop independently`, async ({ page }) => {
    await mount(page, framework, { dismissible: true, closeOnEscape: true, closeOnBackdropClick: true });
    const update = (options: DialogOptions) => page.evaluate(async options => {
      (window as unknown as { dialogParent: { setOptions(options: DialogOptions): void } }).dialogParent.setOptions(options);
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    }, options);
    await page.getByRole("dialog").focus();
    await page.keyboard.press("Escape"); expect(await requests(page)).toEqual([false]);
    await update({ closeOnEscape: false });
    await page.keyboard.press("Escape"); expect(await requests(page)).toEqual([false]);
    await update({ closeOnEscape: true });
    await page.keyboard.press("Escape"); expect(await requests(page)).toEqual([false, false]);
    await update({ dismissible: false });
    await expect(page.getByRole("button", { name: closeLabel, exact: true })).toHaveCount(0);
    await backdropClick(page); expect(await requests(page)).toEqual([false, false]);
    await page.getByRole("dialog").focus();
    await page.keyboard.press("Escape"); expect(await requests(page)).toEqual([false, false, false]);
    await update({ dismissible: true, closeOnBackdropClick: false });
    await expect(page.getByRole("button", { name: closeLabel, exact: true })).toHaveCount(1);
    await backdropClick(page); expect(await requests(page)).toEqual([false, false, false]);
    await update({ closeOnBackdropClick: true });
    await backdropClick(page); expect(await requests(page)).toEqual([false, false, false, false]);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
  test(`${framework}: localized close glyph handles pointer and keyboard while the owner refuses`, async ({ page }, info) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await mount(page, framework);
    const button = page.getByRole("button", { name: closeLabel, exact: true }); await expect(button).toBeVisible();
    const svg = button.locator('svg[data-fsds-icon="x"]'); await expect(svg).toBeVisible();
    const box = await svg.boundingBox(); expect(box?.width).toBe(16); expect(box?.height).toBe(16);
    const paths = await svg.locator("path[d]").evaluateAll(elements => elements.map(element => element.getAttribute("d")));
    expect(paths.length).toBeGreaterThan(0); expect(paths.every(path => typeof path === "string" && path.trim().length > 0)).toBe(true);
    await expect(button.getByRole("img")).toHaveCount(0);
    await button.click(); await expect.poll(() => requests(page)).toEqual([false]);
    await button.focus(); await page.keyboard.press("Enter"); await expect.poll(() => requests(page)).toEqual([false, false]);
    await page.keyboard.press("Space"); await expect.poll(() => requests(page)).toEqual([false, false, false]);
    await expect(page.getByRole("dialog")).toBeVisible();
    await backdropClick(page); await expect.poll(() => requests(page)).toEqual([false, false, false, false]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`${framework}-localized-close.png`) });
  });
  for (const [dismissible, closeOnBackdropClick] of [[true, true], [false, true], [true, false], [false, false]]) {
    test(`${framework}: backdrop respects dismissible=${dismissible} and closeOnBackdropClick=${closeOnBackdropClick}`, async ({ page }) => {
      await mount(page, framework, { dismissible, closeOnBackdropClick });
      await expect(page.getByRole("button", { name: closeLabel, exact: true })).toHaveCount(dismissible ? 1 : 0);
      await backdropClick(page);
      expect(await requests(page)).toEqual(dismissible && closeOnBackdropClick ? [false] : []);
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  }
  for (const closeOnEscape of [true, false]) {
    test(`${framework}: nondismissible Escape follows its independent ${closeOnEscape} policy`, async ({ page }) => {
      await mount(page, framework, { dismissible: false, closeOnEscape });
      await expect(page.getByRole("button", { name: closeLabel, exact: true })).toHaveCount(0);
      await expect.poll(() => page.getByRole("dialog").evaluate(element => {
        let active = element.ownerDocument.activeElement;
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
        return active === element || element.contains(active);
      })).toBe(true);
      await page.keyboard.press("Escape");
      expect(await requests(page)).toEqual(closeOnEscape ? [false] : []);
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  }
  test(`${framework}: accepted close hides the dialog and returns focus`, async ({ page }) => {
    await mount(page, framework);
    await page.evaluate(() => (window as unknown as { dialogParent: { setAccepting(value: boolean): void } }).dialogParent.setAccepting(true));
    await page.getByRole("button", { name: closeLabel, exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Return target", exact: true })).toBeFocused();
    expect(await requests(page)).toEqual([false]);
  });
}
