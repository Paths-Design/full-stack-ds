import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

async function mount(page: Page, width: number, options: { controlled?: boolean; disabled?: boolean } = {}) {
  await page.goto("/preview/lit/Accordion");
  await page.locator("body[data-fsds-ready]").waitFor();
  await page.evaluate(({ width, options }) => {
    const existing = document.querySelector("fsds-accordion");
    if (!existing) throw new Error("Preview did not load the public Accordion element");
    const root = document.createElement("fsds-accordion");
    Object.assign(root, { type: "single", collapsible: true, defaultValue: "", disabled: options.disabled ?? false });
    if (options.controlled) Object.assign(root, { value: "" });
    const state = window as unknown as { requests: Array<string | string[]> };
    state.requests = [];
    Object.assign(root, { onValueChange: (value: string | string[]) => state.requests.push(value) });
    root.style.width = `${width}px`;
    const item = document.createElement("fsds-accordion-item");
    item.style.width = `${width}px`; item.style.boxSizing = "border-box";
    const trigger = document.createElement("fsds-accordion-trigger");
    const content = document.createElement("fsds-accordion-content");
    Object.assign(trigger, { value: "release" }); Object.assign(content, { value: "release" });
    trigger.textContent = "Release section"; content.textContent = "Release content";
    item.append(trigger, content); root.append(item);
    const before = document.createElement("button"); before.textContent = "Before";
    const after = document.createElement("button"); after.textContent = "After";
    existing.replaceWith(before, root, after);
  }, { width, options });
  await expect(page.getByRole("button", { name: "Release section", exact: true })).toHaveCount(1);
}

async function geometry(page: Page) {
  return page.locator("fsds-accordion-trigger").evaluate(trigger => {
    const item = trigger.parentElement!;
    const icon = trigger.shadowRoot?.querySelector("fsds-icon")?.shadowRoot?.querySelector("svg");
    if (!icon) throw new Error("Declared chevron SVG is missing");
    const nativeButton = document.createElement("button");
    nativeButton.style.position = "absolute"; nativeButton.style.left = "-9999px";
    document.body.append(nativeButton);
    const nativeBoxSizing = getComputedStyle(nativeButton).boxSizing;
    nativeButton.remove();
    const style = getComputedStyle(trigger), itemStyle = getComputedStyle(item);
    return {
      nativeBoxSizing, boxSizing: style.boxSizing, width: style.width,
      paddingInlineStart: style.paddingInlineStart, paddingInlineEnd: style.paddingInlineEnd,
      overflow: itemStyle.overflow,
      item: item.getBoundingClientRect().toJSON(), trigger: trigger.getBoundingClientRect().toJSON(), icon: icon.getBoundingClientRect().toJSON(),
      borderLeft: parseFloat(itemStyle.borderLeftWidth), borderRight: parseFloat(itemStyle.borderRightWidth),
    };
  });
}

for (const width of [320, 160]) {
  test(`Lit compound button retains native sizing at ${width}px`, async ({ page }, info) => {
    await mount(page, width);
    const svg = page.locator('fsds-accordion-trigger svg[data-fsds-icon="chevron-down"]');
    await expect(svg).toBeVisible();
    const boxes = await geometry(page);
    expect(boxes.item.width).toBe(width);
    await writeFile(info.outputPath("computed-boxes.json"), JSON.stringify(boxes, null, 2));
    await info.attach("computed-boxes", { body: JSON.stringify(boxes, null, 2), contentType: "application/json" });
    await page.screenshot({ path: info.outputPath(`Accordion-${width}.png`) });
    expect(boxes.nativeBoxSizing).toBe("border-box");
    expect.soft(boxes.boxSizing).toBe(boxes.nativeBoxSizing);
    expect(boxes.icon.width).toBe(16); expect(boxes.icon.height).toBe(16);
    expect.soft(boxes.trigger.right).toBeLessThanOrEqual(boxes.item.right - boxes.borderRight + 0.25);
    expect.soft(boxes.icon.right).toBeLessThanOrEqual(boxes.item.right - boxes.borderRight + 0.25);
    expect(boxes.icon.left).toBeGreaterThanOrEqual(boxes.item.left + boxes.borderLeft - 0.25);
  });
}

for (const controlled of [false, true]) {
  test(`Lit sized compound trigger preserves ${controlled ? "controlled" : "uncontrolled"} activation`, async ({ page }) => {
    await mount(page, 320, { controlled });
    const trigger = page.getByRole("button", { name: "Release section", exact: true });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", controlled ? "false" : "true");
    await trigger.focus(); await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Space");
    await expect(trigger).toHaveAttribute("aria-expanded", controlled ? "false" : "true");
    expect(await page.evaluate(() => (window as unknown as { requests: unknown[] }).requests)).toEqual(controlled ? ["release", "release", "release"] : ["release", "", "release"]);
    await expect(trigger).toBeFocused();
  });
}

test("Lit sized compound trigger suppresses disabled activation and tab focus", async ({ page }) => {
  await mount(page, 320, { disabled: true });
  const trigger = page.getByRole("button", { name: "Release section", exact: true });
  await expect(trigger).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Before", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "After", exact: true })).toBeFocused();
  await trigger.dispatchEvent("click");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.dispatchEvent("keydown", { key: "Enter" });
  await trigger.dispatchEvent("keydown", { key: " " });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => (window as unknown as { requests: unknown[] }).requests)).toEqual([]);
  await page.locator("fsds-accordion").evaluate(root => Object.assign(root, { disabled: false }));
  await expect(trigger).not.toHaveAttribute("aria-disabled", "true");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => (window as unknown as { requests: unknown[] }).requests)).toEqual(["release"]);
});
