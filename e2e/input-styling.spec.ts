import { test, expect, type Page } from "@playwright/test";

const frameworks = ["react", "vue", "svelte", "angular", "lit"] as const;
const themes = ["light", "dark"] as const;

async function preview(page: Page, framework: string, component: string, props: Record<string, unknown>, theme: string) {
  await page.goto(`/preview/${framework}/${component}`);
  await page.locator("body[data-fsds-ready]").waitFor();
  await page.evaluate(({ props, theme }) => {
    document.documentElement.dataset.theme = theme;
    window.postMessage({ type: "fsds:config", props, tokenCss: "" }, "*");
  }, { props, theme });
}

for (const framework of frameworks) {
  for (const theme of themes) {
    test(`${framework} ${theme}: Switch has visible keyboard focus and centered thumbs`, async ({ page }) => {
      await preview(page, framework, "Switch", { size: "sm" }, theme);
      await expect(page.locator(".switch--sm")).toBeVisible();
      const input = page.locator(".switch__input");
      const track = page.locator(".switch__track");
      const thumb = page.locator(".switch__thumb");
      await input.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(input).toBeFocused();
      await expect.poll(() => input.evaluate((el) => el.matches(":focus-visible"))).toBe(true);
      await expect(track).toHaveCSS("outline-style", "solid");
      await expect(track).toHaveCSS("outline-width", "2px");
      for (const size of ["sm", "md", "lg"]) {
        await page.evaluate((size) => window.postMessage({ type: "fsds:config", props: { size }, tokenCss: "" }, "*"), size);
        await expect(page.locator(`.switch--${size}`)).toBeVisible();
        const a = await track.boundingBox();
        const b = await thumb.boundingBox();
        expect(a).not.toBeNull(); expect(b).not.toBeNull();
        expect(Math.abs(b!.y + b!.height / 2 - a!.y - a!.height / 2)).toBeLessThan(0.5);
      }
    });

    test(`${framework} ${theme}: Checkbox differentiates unchecked, checked and mixed`, async ({ page }) => {
      await preview(page, framework, "Checkbox", { checked: false, indeterminate: false }, theme);
      const mark = () => page.locator(".checkbox__indicator").evaluate((el) => {
        const s = getComputedStyle(el, "::after");
        return { opacity: s.opacity, width: s.width, height: s.height, border: s.borderBottomWidth, background: s.backgroundColor };
      });
      await expect.poll(async () => (await mark()).opacity).toBe("0");
      await page.evaluate(() => window.postMessage({ type: "fsds:config", props: { checked: true, indeterminate: false }, tokenCss: "" }, "*"));
      await expect(page.locator(".checkbox__input")).toBeChecked();
      await expect.poll(async () => (await mark()).opacity).toBe("1");
      expect((await mark()).border).toBe("2px");
      await page.evaluate(() => window.postMessage({ type: "fsds:config", props: { checked: false, indeterminate: true }, tokenCss: "" }, "*"));
      await expect.poll(() => page.locator(".checkbox__input").evaluate((el) => (el as HTMLInputElement).indeterminate)).toBe(true);
      const mixed = await mark();
      expect(mixed.opacity).toBe("1"); expect(mixed.width).toBe("8px"); expect(mixed.height).toBe("2px");
      expect(mixed.background).not.toBe("rgba(0, 0, 0, 0)");
    });

    test(`${framework} ${theme}: Select themes its search input and paints selection and hover`, async ({ page }) => {
      await preview(page, framework, "Select", { searchable: true, open: true, value: "beta" }, theme);
      const search = page.locator(".select__searchInput");
      await expect(search).toHaveAttribute("aria-label", "Search options");
      const surface = await page.locator(".select__content").evaluate((el) => getComputedStyle(el).backgroundColor);
      await expect(search).toHaveCSS("background-color", surface);
      const selected = page.locator('.select__option[aria-selected="true"]');
      await expect(selected).toHaveCount(1);
      const fill = await selected.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(fill).not.toBe(surface); expect(fill).not.toBe("rgba(0, 0, 0, 0)");
      const option = page.locator('.select__option[aria-selected="false"]').first();
      const idle = await option.evaluate((el) => getComputedStyle(el).backgroundColor);
      await option.hover();
      await expect.poll(() => option.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(idle);
    });
  }
}

for (const theme of themes) {
  test(`composition ${theme}: Field delegates its only surface and focus ring to Input`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem("fsds-theme", theme), theme);
    await page.goto("/#/component/Field/design");
    const control = page.locator(".field__control").filter({ has: page.locator("input.input") }).first();
    const input = control.locator("input.input");
    await page.keyboard.press("Tab"); await input.focus();
    await expect(input).toHaveCSS("outline-style", "solid");
    await expect(input).toHaveCSS("outline-width", "2px");
    await expect(control).toHaveCSS("outline-style", "none");
    await expect(control).toHaveCSS("border-top-width", "0px");
    await expect(control).toHaveCSS("padding-top", "0px");
    const invalid = page.locator(".field--invalid input.input");
    await expect(invalid).toHaveAttribute("aria-invalid", "true");
    await expect(invalid).toHaveAttribute("required", "");
    const describedBy = await invalid.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText("Username is already taken");
    const selectControl = page.locator(".field__control").filter({ has: page.locator(".select__trigger") });
    const trigger = selectControl.locator(".select__trigger");
    await trigger.focus();
    await expect(trigger).toHaveCSS("outline-style", "solid");
    await expect(trigger).toHaveCSS("outline-width", "2px");
    await expect(selectControl).toHaveCSS("outline-style", "none");
    await expect(selectControl).toHaveCSS("border-top-width", "0px");
  });
}

test("showcase reset preserves ToggleSwitch state fill", async ({ page }) => {
  await page.goto("/#/settings");
  const toggle = page.locator("button.toggle-switch").first();
  const before = await toggle.evaluate((el) => ({ checked: el.getAttribute("aria-checked"), fill: getComputedStyle(el).backgroundColor }));
  expect(before.fill).not.toBe("rgba(0, 0, 0, 0)");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", before.checked === "true" ? "false" : "true");
  await expect.poll(() => toggle.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before.fill);
});
