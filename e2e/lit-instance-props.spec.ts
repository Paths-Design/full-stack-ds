import { expect, test } from "@playwright/test";

const cases = [
  { component: "Accordion", props: {}, target: ".accordion__chevron", property: "size", value: "sm", glyph: true },
  { component: "Alert", props: { dismissible: true }, target: ".alert__dismiss", property: "type", value: "button" },
  { component: "Avatar", props: { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="blue"/></svg>', name: "Avatar" }, target: ".avatar__image", property: "alt", value: "" },
  { component: "Button", props: { loading: true }, target: ".button__spinner", property: "size", value: "sm" },
  { component: "Carousel", props: { slides: ["One", "Two", "Three"] }, target: ".carousel__pagination", property: "presentation", value: "indicators" },
  { component: "Chip", props: { dismissible: true }, target: ".chip__action", property: "variant", value: "ghost" },
  { component: "Command", props: { open: true }, target: ".command__searchIcon", property: "size", value: "sm", glyph: true },
  { component: "Details", props: { summary: "Release details" }, target: ".details__icon", property: "size", value: "sm", glyph: true },
  { component: "PageNavigator", props: { pageCount: 3 }, target: ".page-navigator__input", property: "type", value: "number" },
  { component: "Status", props: { status: "success" }, target: ".status__icon", property: "size", value: "sm", glyph: true },
] as const;

for (const sample of cases) {
  test(`Lit ${sample.component}: declared literal props reach referenced components`, async ({ page }, info) => {
    await page.goto(`/preview/lit/${sample.component}`);
    await page.locator("body[data-fsds-ready]").waitFor();
    await page.evaluate(props => window.postMessage({ type: "fsds:config", props, tokenCss: "" }, "*"), sample.props);
    const target = page.locator(sample.target).first();
    await expect(target).toHaveJSProperty(sample.property, sample.value);
    if ("glyph" in sample) {
      const svg = target.locator("svg[data-fsds-icon]");
      await expect(svg).toBeVisible();
      const box = await svg.boundingBox();
      expect(box?.width).toBe(16); expect(box?.height).toBe(16);
      expect(await svg.locator("path[d]").count()).toBeGreaterThan(0);
    }
    if (sample.component === "Chip") await expect(target.locator("button")).toHaveClass(/button--ghost/);
    if (sample.component === "PageNavigator") {
      const input = page.getByRole("spinbutton", { name: "Current page" });
      await expect(input).toHaveValue("1");
      await page.getByRole("button", { name: "Next page" }).click();
      await expect(input).toHaveValue("2");
    }
    if (sample.component === "Carousel") {
      await expect(target.locator(".pagination")).toHaveClass(/pagination--indicators/);
      await expect(page.locator(".carousel__previous svg[data-fsds-icon]")).toHaveAttribute("width", "16");
      await expect(page.locator(".carousel__next svg[data-fsds-icon]")).toHaveAttribute("width", "16");
    }
    if (sample.component === "Avatar") await expect(target.locator("img")).toHaveAttribute("alt", "");
    await page.screenshot({ path: info.outputPath(`${sample.component}.png`) });
  });
}
