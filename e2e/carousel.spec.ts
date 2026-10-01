import { test, expect, type Page } from "@playwright/test";

const frameworks = ["react", "vue", "svelte", "angular", "lit"] as const;
async function configure(page: Page, extra: Record<string, unknown> = {}) {
  await page.evaluate(extra => window.postMessage({ type: "fsds:config", props: {
    slides: ["First", "Second", "Third"], duration: 1000, autoPlay: true, indicator: "both", ...extra,
  }, tokenCss: "" }, "*"), extra);
  await expect(page.locator(".carousel")).toHaveClass(new RegExp(`carousel--${extra.indicator ?? "both"}`));
  // Config previews may replace their text slot on every update. Reattach
  // this test's consumer-owned DOM fixture after that framework render.
  await page.locator(".carousel__viewport").evaluate(viewport => {
    const fixture = (window as unknown as { sequenceFixture?: HTMLElement[] }).sequenceFixture;
    if (!fixture) return;
    const host = viewport.querySelector("slot") ? (viewport.getRootNode() as ShadowRoot).host : viewport;
    if (fixture.some(el => el.parentElement !== host)) host.replaceChildren(...fixture);
  });
}
async function mount(page: Page, framework: string) {
  await page.goto(`/preview/${framework}/Carousel`);
  await page.locator("body[data-fsds-ready]").waitFor({ state: "attached" });
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await configure(page);
  await expect(page.locator(".pagination__item")).toHaveCount(3);
  // The generic preview accepts a text child, not component trees. Supply
  // owned consumer elements at the DOM boundary; the React showcase test
  // below separately exercises actual framework-rendered Card composition.
  await page.locator(".carousel__viewport").evaluate(viewport => {
    const slot = viewport.querySelector("slot");
    const host = slot ? (viewport.getRootNode() as ShadowRoot).host : viewport;
    const children = ["First", "Second", "Third"].map(label => {
      const card = document.createElement("article");
      card.style.cssText = "display:flex; padding:48px; background:#eef2ff; color:#111";
      const button = document.createElement("button"); button.textContent = `${label} action`;
      card.append(button); return card;
    });
    (window as unknown as { sequenceFixture: HTMLElement[] }).sequenceFixture = children;
    host.replaceChildren(...children);
  });
  await expect(page.locator("article").nth(0)).toBeVisible();
  await expect(page.locator("article").nth(1)).toBeHidden();
}
const progress = (page: Page, selector: string) => page.locator(selector).evaluate(el => Number((el as HTMLElement).style.getPropertyValue("--sequence-progress")));

for (const framework of frameworks) {
  test(`${framework}: composed Pagination picks a slide through the owning sequence`, async ({ page }) => {
    await mount(page, framework);
    await page.locator(".pagination__item").nth(2).click();
    await page.clock.runFor(400);
    await expect(page.locator("article").nth(2)).toBeVisible();
    await expect(page.locator("article").nth(0)).toBeHidden();
    await expect(page.locator(".pagination__item").nth(2)).toHaveAttribute("aria-current", "true");
    await expect(page.locator(".carousel__rotation")).toHaveAccessibleName("Start slide rotation");
    await page.mouse.move(0, 0);
    await page.clock.runFor(3000);
    await expect(page.locator("article").nth(2)).toBeVisible();
  });

  test(`${framework}: pointer Stop remains stopped after focus and allows explicit restart`, async ({ page }) => {
    await mount(page, framework);
    const rotation = page.locator(".carousel__rotation");
    await expect(rotation).toHaveAccessibleName("Stop slide rotation");
    await rotation.click();
    await expect(rotation).toHaveAccessibleName("Start slide rotation");
    await page.mouse.move(0, 0);
    await page.clock.runFor(3000);
    await expect(page.locator(".pagination__item").nth(0)).toHaveAttribute("aria-disabled", "true");
    await rotation.click();
    await expect(rotation).toHaveAccessibleName("Stop slide rotation");
    await page.mouse.move(0, 0);
    await page.clock.runFor(1020);
    await expect(page.locator(".pagination__item").nth(1)).toHaveAttribute("aria-disabled", "true");
  });

  test(`${framework}: one slide budget drives pill, ring, advance and focus stop`, async ({ page }) => {
    await mount(page, framework);
    await page.clock.runFor(400);
    expect(await progress(page, ".carousel__ring")).toBeCloseTo(0.4, 1);
    expect(await progress(page, '.pagination__item[data-sequence-active="true"] .pagination__fill'))
      .toBe(await progress(page, ".carousel__ring"));
    await page.clock.runFor(620);
    await expect(page.locator("article").nth(1)).toBeVisible();
    await expect(page.locator("article").nth(0)).toBeHidden();
    await expect(page.locator(".pagination__item").nth(1)).toHaveAttribute("aria-disabled", "true");
    await page.locator(".carousel__next").focus();
    await expect(page.locator(".carousel__rotation")).toHaveAccessibleName("Start slide rotation");
    await page.locator(".carousel__next").evaluate(el => (el as HTMLElement).blur());
    await page.clock.runFor(3000);
    await expect(page.locator("article").nth(1)).toBeVisible();
    await page.locator(".carousel__rotation").evaluate(el => (el as HTMLElement).click());
    await expect(page.locator(".carousel__rotation")).toHaveAccessibleName("Stop slide rotation");
    await page.clock.runFor(1020);
    await expect(page.locator("article").nth(2)).toBeVisible();
  });

  test(`${framework}: slides directionally, reverses interrupted movement and respects reduced motion`, async ({ page }) => {
    await mount(page, framework);
    await page.locator(".carousel__next").click();
    await page.clock.runFor(20);
    await expect(page.locator(".pagination__item").nth(1)).toHaveAttribute("aria-disabled", "true");
    const inspect = () => page.locator("article").evaluateAll(elements => elements.map(el => {
      const animation = el.getAnimations()[0];
      if (!animation) return null;
      animation.pause();
      const duration = Number(animation.effect!.getTiming().duration);
      animation.currentTime = duration / 2;
      return { frames: (animation.effect as KeyframeEffect).getKeyframes().map(frame => frame.transform),
        x: new DOMMatrix(getComputedStyle(el).transform).m41, duration };
    }));
    const forward = await inspect();
    expect(forward[0]!.frames.at(-1)).toBe("translateX(-100%)");
    expect(forward[1]!.frames[0]).toBe("translateX(100%)");
    expect(forward[0]!.x).toBeLessThan(0);
    expect(forward[1]!.x).toBeGreaterThan(0);
    await expect(page.locator("article").nth(0)).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("article").nth(0)).toHaveAttribute("inert", "");
    await page.locator(".carousel__previous").click();
    await page.clock.runFor(20);
    await expect(page.locator(".pagination__item").nth(0)).toHaveAttribute("aria-disabled", "true");
    const reverse = await inspect();
    expect(reverse[1]!.frames.at(-1)).toBe("translateX(100%)");
    expect(reverse[0]!.frames[0]).toMatch(/^matrix/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => page.locator("article").evaluateAll(els => els.flatMap(el => el.getAnimations()).length)).toBe(0);
    await expect(page.locator("article").nth(1)).toBeHidden();
    await page.locator(".carousel__next").click();
    await page.clock.runFor(20);
    await expect(page.locator("article").nth(1)).toBeVisible();
    expect(await page.locator("article").evaluateAll(els => els.flatMap(el => el.getAnimations()).length)).toBe(0);
  });

  test(`${framework}: reduced motion, alternative indicators and manual navigation`, async ({ page }) => {
    await mount(page, framework);
    await page.clock.runFor(450);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => progress(page, ".carousel__ring")).toBe(0.4);
    await configure(page, { indicator: "pagination" });
    // Preview reconfiguration can remount the controller. Advance beyond the
    // first reduced-motion step before asserting the transformed fill has area.
    await page.clock.runFor(400);
    await expect(page.locator(".carousel__ring")).toBeHidden();
    await expect(page.locator('.pagination__item[data-sequence-active="true"] .pagination__fill')).toBeVisible();
    await configure(page, { indicator: "next" });
    await expect(page.locator(".carousel__ring")).toBeVisible();
    await expect(page.locator(".pagination__fill").first()).toBeHidden();
    await configure(page, { duration: null, autoPlay: false });
    await expect(page.locator(".carousel__ring")).toBeHidden();
    await page.locator(".carousel__next").click();
    await page.clock.runFor(20);
    await expect(page.locator("article").nth(1)).toBeVisible();
    await expect(page.locator(".carousel__viewport")).toHaveAttribute("aria-live", "polite");
  });
}

test("Lit generated Cards move their rendered content through transparent hosts", async ({ page }) => {
  await mount(page, "lit");
  await page.evaluate(async () => {
    const modulePath = "/packages/ds-lit/src/components/Card/Card.ts";
    await import(modulePath);
  });
  await page.locator(".carousel__viewport").evaluate(viewport => {
    const host = (viewport.getRootNode() as ShadowRoot).host;
    host.replaceChildren(...["First", "Second", "Third"].map(label => {
      const card = document.createElement("fsds-card");
      const content = document.createElement("div");
      content.dataset.slideContent = label;
      content.textContent = label;
      content.style.cssText = "height:80px;width:200px";
      card.append(content);
      return card;
    }));
    (viewport as HTMLElement).style.width = "320px";
  });
  await expect(page.locator('fsds-card').nth(0).locator(".card")).toBeVisible();
  await page.locator(".carousel__next").click();
  await page.clock.runFor(20);
  const geometry = await page.locator("fsds-card").nth(1).evaluate(card => {
    const animation = card.getAnimations()[0];
    if (!animation) throw new Error("Expected a slide animation on the generated Card host");
    const content = card.querySelector<HTMLElement>("[data-slide-content]")!;
    animation.pause();
    const duration = Number(animation.effect!.getTiming().duration);
    const positions = [0, duration / 2, duration].map(time => {
      animation.currentTime = time;
      return content.getBoundingClientRect().x;
    });
    animation.currentTime = duration / 2;
    return { positions, width: card.getBoundingClientRect().width, duration };
  });
  expect(geometry.width).toBeCloseTo(320);
  expect(geometry.duration).toBe(250);
  expect(geometry.positions[0]).toBeGreaterThan(geometry.positions[1]);
  expect(geometry.positions[1]).toBeGreaterThan(geometry.positions[2]);
  await page.locator(".carousel__previous").click();
  await page.clock.runFor(20);
  const reversed = await page.locator("fsds-card").nth(1).evaluate(card => {
    const animation = card.getAnimations()[0];
    if (!animation) throw new Error("Expected interrupted Card to move back out");
    animation.pause();
    animation.currentTime = Number(animation.effect!.getTiming().duration);
    return card.querySelector("[data-slide-content]")!.getBoundingClientRect().x;
  });
  expect(reversed).toBeGreaterThan(geometry.positions[1]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.locator("fsds-card").evaluateAll(cards => cards.flatMap(card => card.getAnimations()).length)).toBe(0);
  await expect(page.locator("fsds-card").nth(1)).toBeHidden();
  await page.locator(".carousel__previous").click();
  await page.clock.runFor(20);
  await expect(page.locator("fsds-card").nth(2)).toBeVisible();
});

test("React showcase composes actual Cards and both visual treatments", async ({ page }) => {
  await page.goto("/#/component/Carousel/design");
  const example = page.locator('[data-usage-example="timed-both"]');
  await expect(example.locator(".pagination__item")).toHaveCount(3);
  await expect(example.locator(".card").nth(0)).toBeVisible();
  await expect(example.locator(".card").nth(1)).toBeHidden();
  await example.locator(".carousel__next").click();
  await expect(example.locator(".card").nth(1)).toBeVisible();
});
