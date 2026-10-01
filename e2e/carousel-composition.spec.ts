import { test, expect, type Page, type Locator } from "@playwright/test";

async function mountComposition(page: Page, framework: string) {
  // Keep real browser animations seekable so assertions sample geometry at
  // deterministic times, rather than racing the automation transport.
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const animation = animate.apply(this, args);
      animation.pause();
      return animation;
    };
  });
  if (framework !== "angular") {
    await page.goto(`/e2e/fixtures/carousel.html?framework=${framework}`);
  } else {
    // Reuse the preview's local Angular import map and compiled components.
    // This consumer template is compiled by Angular JIT, not emulated in DOM.
    await page.goto("/preview/angular/Carousel");
    await page.locator("body[data-fsds-ready]").waitFor({ state: "attached" });
    await page.evaluate(async () => {
      const corePath = "/preview/angular/vendor/@angular/core/fesm2022/core.mjs";
      const platformPath = "/preview/angular/vendor/@angular/platform-browser/fesm2022/platform-browser.mjs";
      const carouselPath = "/preview/angular/src/components/Carousel/Carousel.component.js";
      const cardPath = "/preview/angular/src/components/Card/Card.component.js";
      const { Component, signal, provideZonelessChangeDetection } = await import(corePath);
      const { bootstrapApplication } = await import(platformPath);
      const { CarouselComponent } = await import(carouselPath);
      const { CardComponent } = await import(cardPath);
      class Composition {
        count = signal(0);
        increment() { this.count.update((value: number) => value + 1); }
      }
      Component({
        selector: "carousel-composition", standalone: true,
        imports: [CarouselComponent, CardComponent],
        styles: [":host { display:block; width:320px; }"],
        template: `<fsds-carousel [slides]="['First', 'Second', 'Third']" [duration]="null">
          <fsds-card><button data-content="First" (click)="increment()">First {{count()}}</button></fsds-card>
          <fsds-card><button data-content="Second">Second</button></fsds-card>
          <fsds-card><button data-content="Third">Third</button></fsds-card>
        </fsds-carousel>`,
      })(Composition);
      document.querySelector<HTMLElement>("fsds-host")!.style.display = "none";
      const host = document.createElement("carousel-composition");
      host.id = "composition";
      host.style.flexShrink = "0";
      document.body.append(host);
      await bootstrapApplication(Composition, { providers: [provideZonelessChangeDetection()] });
      document.body.dataset.compositionReady = "";
    });
  }
  await page.locator("body[data-composition-ready]").waitFor({ state: "attached" });
  const root = page.locator("#composition");
  await expect(root.locator('[data-content="First"]')).toBeVisible();
  await expect(root.locator('[data-content="Second"]')).toBeHidden();
  return root;
}

async function positions(content: Locator) {
  return content.evaluate(element => {
    let boundary: Element | null = element;
    while (boundary && !boundary.getAnimations().length) {
      boundary = boundary.parentElement ?? (boundary.getRootNode() as ShadowRoot).host ?? null;
    }
    if (!boundary) throw new Error("Rendered content has no animated ancestor");
    const animation = boundary.getAnimations()[0];
    const duration = Number(animation.effect!.getTiming().duration);
    const x = [0, duration / 2, duration].map(time => {
      animation.currentTime = time;
      return element.getBoundingClientRect().x;
    });
    animation.currentTime = duration / 2;
    return { x, duration, width: boundary.getBoundingClientRect().width };
  });
}

for (const framework of ["react", "vue", "svelte", "angular", "lit"]) {
  test(`${framework}: actual Card composition preserves consumer bindings and directional geometry`, async ({ page }) => {
    const root = await mountComposition(page, framework);
    const first = root.locator('[data-content="First"]');
    const second = root.locator('[data-content="Second"]');
    const third = root.locator('[data-content="Third"]');
    await first.click();
    await expect(first).toHaveText("First 1");
    await root.locator(".carousel__next").click();
    await expect(root.locator(".carousel__picker").nth(1)).toHaveAttribute("aria-disabled", "true");
    const incoming = await positions(second);
    expect(incoming.width).toBeCloseTo(320);
    expect(incoming.duration).toBe(250);
    expect(incoming.x[0]).toBeGreaterThan(incoming.x[1]);
    expect(incoming.x[1]).toBeGreaterThan(incoming.x[2]);
    await root.locator(".carousel__previous").click();
    await expect(root.locator(".carousel__picker").nth(0)).toHaveAttribute("aria-disabled", "true");
    const outgoing = await positions(second);
    expect(outgoing.x[2]).toBeGreaterThan(outgoing.x[0]);
    await expect(first).toHaveText("First 1");
    await root.locator(".carousel__previous").click();
    await expect(root.locator(".carousel__picker").nth(2)).toHaveAttribute("aria-disabled", "true");
    const wrapBack = await positions(third);
    expect(wrapBack.x[0]).toBeLessThan(wrapBack.x[1]);
    expect(wrapBack.x[1]).toBeLessThan(wrapBack.x[2]);
    await page.evaluate(() => document.getAnimations().forEach(animation => animation.finish()));
    await expect(first).toBeHidden();
    await root.evaluate(el => { (el as HTMLElement).style.width = "1280px"; });
    await root.locator(".carousel__next").click();
    await expect(root.locator(".carousel__picker").nth(0)).toHaveAttribute("aria-disabled", "true");
    const wrapForward = await positions(first);
    expect(wrapForward.duration).toBe(500);
    expect(wrapForward.x[0]).toBeGreaterThan(wrapForward.x[2]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(second).toBeHidden();
    await expect(third).toBeHidden();
    await first.click();
    await expect(first).toHaveText("First 2");
    await root.locator(".carousel__next").click();
    await expect(second).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
}
