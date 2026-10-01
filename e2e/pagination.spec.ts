import { expect, test } from "@playwright/test";

for (const framework of ["react", "vue", "svelte", "angular", "lit"]) {
  test(`${framework}: composed page field requests finite positions without owning activity state`, async ({ page }) => {
    await page.goto(`/preview/${framework}/PageNavigator`);
    await page.locator("body[data-fsds-ready]").waitFor({ state: "attached" });
    await page.evaluate(() => window.postMessage({ type: "fsds:config", props: { pageCount: 15 }, tokenCss: "" }, "*"));
    const field = page.getByRole("spinbutton", { name: "Current page" });
    await expect(field).toHaveValue("1");
    await expect(page.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(field).toHaveValue("2");
    await field.fill("12");
    await field.press("Enter");
    await expect(field).toHaveValue("12");
    await field.fill("16");
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await expect(field).toHaveValue("12");
    await field.fill("15");
    await field.press("Tab");
    await expect(field).toHaveValue("15");
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
    await field.fill("3");
    await field.press("Escape");
    await expect(field).toHaveValue("15");
    await page.evaluate(() => window.postMessage({ type: "fsds:config", props: { pageCount: 0 }, tokenCss: "" }, "*"));
    await expect(field).toBeDisabled();
    await expect(field).toHaveValue("");
    await expect(page.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test(`${framework}: Pagination selects positions independently of paged content`, async ({ page }) => {
    await page.goto(`/preview/${framework}/Pagination`);
    await page.locator("body[data-fsds-ready]").waitFor({ state: "attached" });
    await page.evaluate(() => window.postMessage({ type: "fsds:config", props: {
      pages: ["1", "2", "3"], presentation: "pages", defaultIndex: 0, label: "Result pages",
    }, tokenCss: "" }, "*"));
    const root = page.locator(".pagination");
    await expect(root).toHaveAttribute("aria-label", "Result pages");
    const buttons = root.locator(".pagination__item");
    await expect(buttons).toHaveCount(3);
    await expect(buttons.nth(0)).toHaveAttribute("aria-current", "true");
    await expect(root.locator(".pagination__label").nth(1)).toBeVisible();
    await expect(root.locator(".pagination__marker").nth(1)).toBeHidden();
    await buttons.nth(2).click();
    await expect(buttons.nth(2)).toHaveAttribute("aria-current", "true");
    await expect(buttons.nth(0)).toHaveAttribute("aria-current", "false");
    await expect(buttons.nth(2)).toBeFocused();
    await expect(root.locator(".pagination__fill").nth(2)).toBeHidden();

    await page.evaluate(() => window.postMessage({ type: "fsds:config", props: {
      pages: ["Overview", "Details", "Review"], presentation: "indicators", defaultIndex: 0,
    }, tokenCss: "" }, "*"));
    await expect(root).toHaveClass(/pagination--indicators/);
    await buttons.nth(1).click();
    await expect(buttons.nth(1)).toHaveAttribute("aria-current", "true");
    await expect(root.locator(".pagination__marker").nth(1)).toBeVisible();
    await expect(root.locator(".pagination__label").nth(1)).toBeHidden();
    await expect(root.locator(".pagination__fill").nth(1)).toBeHidden();
  });
}
