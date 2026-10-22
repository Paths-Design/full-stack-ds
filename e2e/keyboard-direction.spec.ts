import { expect, test } from "@playwright/test";

const cases = ["uppercase", "css-override", "auto", "invalid-inner", "nested-ltr"] as const;

for (const framework of ["react", "vue", "svelte", "angular", "lit"] as const) {
  for (const directionCase of cases) {
    test(`${framework}: Calendar follows ${directionCase} reading direction`, async ({ page }) => {
      await page.goto(`/preview/${framework}/Calendar`);
      await page.locator("body[data-fsds-ready]").waitFor({ state: "attached" });
      await page.evaluate(() => window.postMessage({ type: "fsds:config", props: { month: new Date(2031, 2, 1) } }, "*"));
      const day = page.locator('[data-date="2031-03-12"]');
      await expect(day).toBeVisible();
      await page.evaluate(({ framework, directionCase }) => {
        const host = document.querySelector<HTMLElement>(framework === "lit" ? "fsds-calendar" : ".calendar")!;
        const region = document.createElement("section");
        region.id = "direction-probe";
        host.before(region);
        region.append(host);
        region.dir = "RTL";
        if (directionCase === "css-override") {
          region.dir = "ltr";
          region.style.direction = "rtl";
        } else if (directionCase === "auto") {
          region.dir = "auto";
          const text = document.createElement("span");
          text.textContent = "שלום";
          region.prepend(text);
        } else if (directionCase === "invalid-inner") {
          host.setAttribute("dir", "invalid");
        } else if (directionCase === "nested-ltr") {
          host.setAttribute("dir", "lTr");
        }
      }, { framework, directionCase });
      const rtl = directionCase !== "nested-ltr";
      await expect(day).toHaveCSS("direction", rtl ? "rtl" : "ltr");
      await day.focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator(`[data-date="2031-03-${rtl ? "11" : "13"}"]`)).toBeFocused();
      // Direction is live: a CSS override must take effect on the next key.
      await page.locator("#direction-probe").evaluate((region) => { region.style.direction = "ltr"; });
      await page.keyboard.press("ArrowRight");
      await expect(page.locator(`[data-date="2031-03-${rtl ? "12" : "14"}"]`)).toBeFocused();
    });
  }
}

for (const framework of ["react", "vue", "svelte", "lit", "lit-in-shadow-root"] as const) {
  for (const directionCase of ["uppercase", "css-override", "auto"] as const) {
    test(`${framework}: Tabs follow ${directionCase} reading direction`, async ({ page }) => {
      await page.goto("/");
      await page.evaluate(async (framework) => {
        const fixture = await import(/* @vite-ignore */ "/e2e/fixtures/rtl-tabs.tsx");
        fixture.mountFixture(framework);
      }, framework);
      const region = page.getByRole("region", { name: `${framework} right-to-left tabs` });
      const first = region.getByRole("tab", { name: "Tab A" });
      const second = region.getByRole("tab", { name: "Tab B" });
      await expect(first).toHaveAttribute("aria-selected", "true");
      await region.evaluate((region, directionCase) => {
        region.setAttribute("dir", "RTL");
        if (directionCase === "css-override") {
          region.setAttribute("dir", "ltr");
          region.style.direction = "rtl";
        } else if (directionCase === "auto") {
          region.setAttribute("dir", "auto");
          const text = document.createElement("span");
          text.textContent = "שלום";
          region.prepend(text);
        }
      }, directionCase);
      await expect(first).toHaveCSS("direction", "rtl");
      await first.focus();
      await page.keyboard.press("ArrowLeft");
      await expect(second).toHaveAttribute("aria-selected", "true");
      await expect(second).toBeFocused();
      await region.evaluate((region) => { region.style.direction = "ltr"; });
      await page.keyboard.press("ArrowLeft");
      await expect(first).toHaveAttribute("aria-selected", "true");
      await expect(first).toBeFocused();
    });
  }
}
