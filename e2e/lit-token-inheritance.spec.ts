import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prepareLitTokenConsumer } from "../scripts/lit-token-inheritance-consumer/harness.js";

type Proof = {
  outer: HTMLElement & { density: string };
  inner: HTMLElement & { density: string };
  button: HTMLElement & { disabled: boolean; loading: boolean; size: string };
  wrapper: HTMLElement;
  syntax: HTMLElement;
  settle(): Promise<void>;
  clicks(): number;
};
declare global { interface Window { fsdsLitTokenProof: Proof } }

let consumer: Awaited<ReturnType<typeof prepareLitTokenConsumer>>;
test.beforeAll(async () => { consumer = await prepareLitTokenConsumer(); });
test.afterAll(async () => { if (consumer) await consumer.close(); });

async function setToken(page: Page, target: "outer" | "inner" | "button" | "wrapper" | "syntax", name: string, value: string | null) {
  await page.evaluate(async ({ target, name, value }) => {
    const proof = window.fsdsLitTokenProof;
    if (value === null) proof[target].style.removeProperty(name);
    else proof[target].style.setProperty(name, value);
    await proof.settle();
  }, { target, name, value });
}

async function capture(page: Page, stage: string) {
  const facts = await page.evaluate(() => {
    const proof = window.fsdsLitTokenProof;
    const read = (host: HTMLElement, selector: string) => {
      const box = host.shadowRoot!.querySelector<HTMLElement>(selector)!;
      const style = getComputedStyle(box), hostStyle = getComputedStyle(host), rect = box.getBoundingClientRect();
      return { tag: box.tagName, width: rect.width, height: rect.height, clientWidth: box.clientWidth, scrollWidth: box.scrollWidth,
        padding: style.padding, gap: style.gap, background: style.backgroundColor, outline: `${style.outlineStyle} ${style.outlineWidth}`,
        hostInset: hostStyle.getPropertyValue("--fsds-card-size-padding-inset").trim(),
        boxInset: style.getPropertyValue("--fsds-card-size-padding-inset").trim(),
        privateInset: style.getPropertyValue("--_fsds-card-size-padding-inset").trim() };
    };
    return { outer: read(proof.outer, ".card"), inner: read(proof.inner, ".card"), button: read(proof.button, "button"), clicks: proof.clicks(),
      brand: proof.wrapper.getAttribute("data-brand"), nodeLanguage: document.documentElement.lang, direction: getComputedStyle(proof.wrapper).direction,
      browser: navigator.userAgent, dpr: devicePixelRatio, prefersDark: matchMedia("(prefers-color-scheme: dark)").matches };
  });
  writeFileSync(join(consumer.evidence, stage + ".json"), JSON.stringify(facts, null, 2));
  return facts;
}

test("installed Card uses brand, inherited, host and nested public token values", async ({ page }) => {
  await page.goto(consumer.url + "/");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  const outer = page.locator("#outer-box"), inner = page.locator("#inner-box");
  await expect(outer).toHaveCSS("padding-top", "12px");
  await expect(inner).toHaveCSS("padding-top", "12px");
  let facts = await capture(page, "card-default-brand-inset");
  expect(facts.outer.hostInset).toBe("12px");
  expect(facts.outer.boxInset).toBe("12px");
  expect(facts.outer.privateInset).toBe("8px");
  expect(facts.outer.scrollWidth).toBeLessThanOrEqual(facts.outer.clientWidth);
  await page.evaluate(async () => { window.fsdsLitTokenProof.outer.density = "default"; await window.fsdsLitTokenProof.settle(); });
  await expect(outer).toHaveCSS("padding-top", "20px");
  await page.evaluate(async () => { window.fsdsLitTokenProof.outer.density = "inset"; await window.fsdsLitTokenProof.settle(); });
  await expect(outer).toHaveCSS("padding-top", "12px");

  const slot = "--fsds-card-size-padding-inset";
  await setToken(page, "wrapper", slot, "27px");
  await expect(outer).toHaveCSS("padding-top", "27px");
  await expect(inner).toHaveCSS("padding-top", "27px");
  await setToken(page, "outer", slot, "31px");
  await expect(outer).toHaveCSS("padding-top", "31px");
  await expect(inner).toHaveCSS("padding-top", "31px");
  await setToken(page, "inner", slot, "19px");
  await expect(inner).toHaveCSS("padding-top", "19px");
  await expect(outer).toHaveCSS("padding-top", "31px");
  await capture(page, "card-nested-local-override");
  await setToken(page, "inner", slot, null);
  await expect(inner).toHaveCSS("padding-top", "31px");
  await setToken(page, "outer", slot, null);
  await expect(outer).toHaveCSS("padding-top", "27px");
  await setToken(page, "wrapper", slot, null);
  await expect(outer).toHaveCSS("padding-top", "12px");

  await page.evaluate(async () => { window.fsdsLitTokenProof.wrapper.dataset.brand = "canary"; await window.fsdsLitTokenProof.settle(); });
  await expect(outer).toHaveCSS("padding-top", "16px");
  await expect(inner).toHaveCSS("padding-top", "16px");
  await capture(page, "card-canary-inset");
  await page.evaluate(async () => { delete window.fsdsLitTokenProof.wrapper.dataset.brand; await window.fsdsLitTokenProof.settle(); });
  await expect(outer).toHaveCSS("padding-top", "12px");

  // A present value with the wrong property type is not an absent variable.
  await setToken(page, "outer", slot, "not-a-length");
  await expect(outer).toHaveCSS("padding-top", "0px");
  await setToken(page, "outer", slot, "initial");
  await expect(outer).toHaveCSS("padding-top", "8px");
  await setToken(page, "outer", slot, null);
  await expect(outer).toHaveCSS("padding-top", "12px");
  facts = await capture(page, "card-restored");
  expect(facts.nodeLanguage).toBe("ar"); expect(facts.direction).toBe("rtl");
  expect(facts.outer.scrollWidth).toBeLessThanOrEqual(facts.outer.clientWidth);
  await page.locator("#proof").screenshot({ path: join(consumer.evidence, "card-restored.png") });
  const cdp = await page.context().newCDPSession(page);
  const ax = await cdp.send("Accessibility.getFullAXTree");
  writeFileSync(join(consumer.evidence, "card-restored-AX.json"), JSON.stringify(ax, null, 2));
  expect(ax.nodes.some(node => !node.ignored && node.role?.value === "StaticText" && node.name?.value?.includes("بطاقة خارجية"))).toBe(true);
  await cdp.detach();
});

test("installed Button preserves local variants, public reads and real keyboard activation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(consumer.url + "/");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  const button = page.locator("#action-box");
  const slot = "--fsds-button-size-gap";
  await expect(button).toHaveCSS("gap", "8px");
  await setToken(page, "wrapper", slot, "17px");
  await expect(button).toHaveCSS("gap", "17px");
  await setToken(page, "button", slot, "21px");
  await expect(button).toHaveCSS("gap", "21px");
  await page.evaluate(async () => { window.fsdsLitTokenProof.button.loading = true; await window.fsdsLitTokenProof.settle(); });
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button.locator(".button__spinner")).toHaveCSS("transform", "none");
  const actualGap = await button.evaluate(element => {
    const spinner = element.querySelector<HTMLElement>(".button__spinner")!;
    const label = element.querySelector<HTMLElement>(".button__loadingText")!;
    const bounds = spinner.getBoundingClientRect(), text = label.getBoundingClientRect();
    // Reduced motion settles rotation before measuring fractional rendered bounds.
    return { width: bounds.width, height: bounds.height,
      gap: Math.max(bounds.left, text.left) - Math.min(bounds.right, text.right),
      transform: getComputedStyle(spinner).transform, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches };
  });
  writeFileSync(join(consumer.evidence, "button-loading-gap.json"), JSON.stringify(actualGap, null, 2));
  expect(actualGap.reducedMotion).toBe(true);
  expect(actualGap.width).toBeGreaterThan(0); expect(actualGap.height).toBeGreaterThan(0);
  expect(actualGap.gap).toBeCloseTo(21, 1);
  await page.locator("#proof").screenshot({ path: join(consumer.evidence, "button-loading-gap.png") });
  await page.evaluate(async () => { window.fsdsLitTokenProof.button.loading = false; await window.fsdsLitTokenProof.settle(); });
  await button.evaluate(element => (element as HTMLElement).style.setProperty("--fsds-button-size-gap", "25px"));
  await expect(button).toHaveCSS("gap", "25px");
  await button.evaluate(element => (element as HTMLElement).style.removeProperty("--fsds-button-size-gap"));
  await expect(button).toHaveCSS("gap", "21px");
  await setToken(page, "button", slot, null);
  await expect(button).toHaveCSS("gap", "17px");
  await setToken(page, "wrapper", slot, null);
  await expect(button).toHaveCSS("gap", "8px");
  await page.evaluate(async () => { window.fsdsLitTokenProof.button.size = "small"; await window.fsdsLitTokenProof.settle(); });
  await expect(button).toHaveCSS("min-height", "28px");
  await page.evaluate(async () => { window.fsdsLitTokenProof.button.size = "large"; await window.fsdsLitTokenProof.settle(); });
  await expect(button).toHaveCSS("min-height", "48px");
  await page.locator("#before-action").focus();
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.fsdsLitTokenProof.clicks())).toBe(1);
  await page.keyboard.press("Tab");
  await expect(page.locator("#after-action")).toBeFocused();
  await page.evaluate(async () => { window.fsdsLitTokenProof.button.disabled = true; await window.fsdsLitTokenProof.settle(); });
  await expect(button).toBeDisabled();
  await button.click({ force: true });
  expect(await page.evaluate(() => window.fsdsLitTokenProof.clicks())).toBe(1);
  await capture(page, "button-variants-and-activation");
});

test("bare package defaults and alias scopes remain valid without optional token CSS", async ({ page }) => {
  await page.goto(consumer.url + "/bare.html");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fsds-core-spacing-size-04").trim())).toBe("");
  const outer = page.locator("#outer-box"), probe = page.locator("#syntax-box"), child = page.locator("#syntax-child");
  await expect(outer).toHaveCSS("padding-top", "8px");
  await setToken(page, "outer", "--fsds-core-spacing-size-04", "22px");
  await expect(outer).toHaveCSS("padding-top", "22px");
  await setToken(page, "outer", "--fsds-core-spacing-size-04", null);
  await expect(outer).toHaveCSS("padding-top", "8px");
  await expect(probe).toHaveCSS("padding-top", "8px");
  await expect(child).toHaveCSS("padding-top", "8px");
  await setToken(page, "syntax", "--fsds-syntax-probe-base", "17px");
  await expect(probe).toHaveCSS("padding-top", "17px");
  await expect(child).toHaveCSS("padding-top", "17px");
  await probe.evaluate(element => element.classList.add("syntax-probe--compact"));
  await expect(probe).toHaveCSS("padding-top", "7px");
  await expect(child).toHaveCSS("padding-top", "7px");
  // A descendant-only base override cannot recompute an inherited alias.
  await child.evaluate(element => (element as HTMLElement).style.setProperty("--fsds-syntax-probe-base", "23px"));
  await expect(child).toHaveCSS("padding-top", "7px");
  // The public alias is read at this consumer and wins over the inherited default.
  await child.evaluate(element => (element as HTMLElement).style.setProperty("--fsds-syntax-probe-alias", "29px"));
  await expect(child).toHaveCSS("padding-top", "29px");
  await expect(probe).toHaveCSS("padding-top", "7px");
  await setToken(page, "syntax", "--fsds-syntax-probe-alias", "21px");
  await expect(probe).toHaveCSS("padding-top", "21px");
  await capture(page, "bare-defaults-and-alias-scopes");
  await page.locator("#proof").screenshot({ path: join(consumer.evidence, "bare-defaults.png") });
});
