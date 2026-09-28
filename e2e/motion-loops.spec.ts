import { test, expect, type Page } from "@playwright/test";

const frameworks = ["react", "vue", "svelte", "angular", "lit"] as const;
async function configure(page: Page, framework: string, props: Record<string, unknown>) {
  if (framework === "lit") {
    // Lit reserves HTMLElement.animate; its public contract is the attribute.
    await page.locator("fsds-skeleton").evaluate((el, props) => {
      for (const [name, value] of Object.entries(props)) el.setAttribute(name, String(value));
    }, props);
    return;
  }
  await page.evaluate((props) => {
    window.postMessage({ type: "fsds:config", props, tokenCss: "" }, "*");
  }, props);
}
async function mount(page: Page, framework: string, component: string) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`/preview/${framework}/${component}`);
  await page.locator("body[data-fsds-ready]").waitFor();
  // Loading placeholders take their width from the consumer layout.
  await page.addStyleTag({ content: "body { display: block; }" });
}

for (const framework of frameworks) {
  test(`${framework}: Spinner owns a token-timed rotation with a static reduced state`, async ({ page }) => {
    await mount(page, framework, "Spinner");
    const root = page.locator(".spinner").first();
    const visual = root.locator(".spinner__visual");
    await expect(visual).toHaveCSS("animation-name", "fsds-spinner-spin");
    await root.evaluate((el) => (el as HTMLElement).style.setProperty("--fsds-spinner-anim-duration", "1600ms"));
    await expect(visual).toHaveCSS("animation-duration", "1.6s");
    const sample = await visual.evaluate((el) => {
      const animations = el.getAnimations();
      if (animations.length !== 1) throw new Error("expected one rotation owner");
      animations[0].pause();
      animations[0].currentTime = 400;
      const transform = new DOMMatrix(getComputedStyle(el).transform);
      return { a: transform.a, b: transform.b };
    });
    expect(sample.a).toBeCloseTo(0, 2);
    expect(sample.b).toBeCloseTo(1, 2);
    await expect(root).toHaveCSS("animation-name", "none");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(visual).toHaveCSS("animation-name", "none");
    await expect(visual).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await expect(visual).toBeVisible();
  });

  test(`${framework}: Skeleton modes own opacity once and none stops multiline motion`, async ({ page }) => {
    await mount(page, framework, "Skeleton");
    const root = page.locator(".skeleton").first();
    await expect(root).toHaveCSS("animation-name", "fsds-skeleton-shimmer");
    await root.evaluate((el) => (el as HTMLElement).style.setProperty("--fsds-skeleton-anim-duration", "100ms"));
    await expect(root).toHaveCSS("animation-duration", "0.2s");
    const opacity = await root.evaluate((el) => {
      const animations = el.getAnimations();
      if (animations.length !== 1) throw new Error("expected one opacity owner");
      animations[0].pause();
      animations[0].currentTime = 100;
      return getComputedStyle(el).opacity;
    });
    expect(Number(opacity)).toBeCloseTo(0.5, 2);
    await configure(page, framework, { animate: "pulse", lines: 3 });
    await expect(root).toHaveCSS("animation-name", "fsds-skeleton-pulse");
    await expect(root.locator(".skeleton__shape")).toHaveCount(3);
    await root.evaluate((el) => (el as HTMLElement).style.setProperty("--fsds-skeleton-anim-duration", "100ms"));
    await expect(root).toHaveCSS("animation-duration", "0.3s");
    for (const shape of await root.locator(".skeleton__shape").all()) {
      await expect(shape).toHaveCSS("animation-name", "none");
    }
    await expect(root).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(root).toHaveCSS("animation-name", "none");
    await expect(root).toHaveCSS("opacity", "1");
    await expect(root).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(root).toHaveCSS("animation-name", "fsds-skeleton-pulse");
    await configure(page, framework, { animate: "none", lines: 3 });
    await expect(root).toHaveCSS("animation-name", "none");
    await expect(root).toHaveCSS("opacity", "1");
    // Mode changes can also start a finite background-color transition.
    await expect.poll(() => root.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await configure(page, framework, { animate: "wipe" });
    await expect.poll(() => root.evaluate((el) => getComputedStyle(el, "::after").animationName))
      .toBe("skeleton-wipe");
  });
}
