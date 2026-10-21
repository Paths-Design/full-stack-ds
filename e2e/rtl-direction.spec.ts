import { expect, test } from "@playwright/test";

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
