import { test, expect, type Page } from "@playwright/test";

const frameworks = ["react", "vue", "svelte", "angular", "lit"] as const;
type Framework = typeof frameworks[number];

async function configure(page: Page, props: Record<string, unknown>) {
  await page.evaluate(next => window.postMessage({ type: "fsds:config", props: next, tokenCss: "" }, "*"), props);
}

function panel(framework: Framework) {
  return framework === "lit" ? "fsds-dialog >> .dialog__modal" : ".dialog__modal";
}

async function prepare(page: Page, framework: Framework, props: Record<string, unknown> = {}) {
  await page.goto(`/preview/${framework}/Dialog`);
  await page.locator("body[data-fsds-ready]").waitFor({ state: "attached" });
  await configure(page, { open: false });
  await expect(page.locator(panel(framework))).toHaveCount(0);
  await page.evaluate(next => {
    const launcher = document.createElement("button");
    launcher.id = "focus-launcher";
    launcher.textContent = "Launch focus fixture";
    launcher.onclick = () => window.postMessage({ type: "fsds:config", props: { open: true, ...next }, tokenCss: "" }, "*");
    const alternate = document.createElement("button");
    alternate.id = "alternate-return";
    alternate.textContent = "Alternate return";
    document.body.append(launcher, alternate);
  }, props);
  return page.locator("#focus-launcher");
}

async function focusedInside(page: Page, framework: Framework) {
  return page.evaluate(isLit => {
    const root = isLit ? document.querySelector("fsds-dialog")?.shadowRoot : document;
    const surface = root?.querySelector(".dialog__modal");
    return !!surface?.contains(root?.activeElement ?? null);
  }, framework === "lit");
}

test.describe("Dialog opening focus", () => {
  for (const framework of frameworks) {
    test(`${framework}: opening, wrapping and return use connected DOM nodes`, async ({ page }) => {
      const launcher = await prepare(page, framework);
      await launcher.click();
      const close = page.locator(panel(framework)).getByRole("button", { name: "Close dialog" });
      await expect(close).toBeFocused();
      // Give portal/render effects time to replace a transient inline panel.
      await page.waitForTimeout(150);
      await expect(close).toBeFocused();
      await expect.poll(() => focusedInside(page, framework)).toBe(true);
      await page.keyboard.press("Shift+Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await configure(page, { open: false });
      await expect(page.locator(panel(framework))).toHaveCount(0);
      await expect(launcher).toBeFocused();
    });

    test(`${framework}: a selector places initial focus on static dialog content`, async ({ page }) => {
      const launcher = await prepare(page, framework, { initialFocus: ".dialog__title" });
      await launcher.click();
      const title = page.locator(panel(framework)).locator(".dialog__title");
      await expect(title).toBeFocused();
      await page.waitForTimeout(150);
      await expect(title).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(page.locator(panel(framework)).getByRole("button", { name: "Close dialog" })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator(panel(framework)).getByRole("button", { name: "Close dialog" })).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(page.locator(panel(framework)).getByRole("button", { name: "Close dialog" })).toBeFocused();
    });

    test(`${framework}: missing initial target falls back and explicit return is honored`, async ({ page }) => {
      const launcher = await prepare(page, framework, { initialFocus: "#missing", returnFocus: "#alternate-return" });
      await launcher.click();
      await expect(page.locator(panel(framework)).getByRole("button", { name: "Close dialog" })).toBeFocused();
      await configure(page, { open: false, returnFocus: "#alternate-return" });
      await expect(page.locator("#alternate-return")).toBeFocused();
    });

    test(`${framework}: a non-modal opening preserves launcher focus`, async ({ page }) => {
      const launcher = await prepare(page, framework, { modal: false, initialFocus: ".dialog__closeButton" });
      await launcher.click();
      await expect(page.locator(panel(framework))).toBeVisible();
      await expect(launcher).toBeFocused();
    });
  }

  for (const initialFocus of ["#profile-slot", "profile-slot"]) {
    test(`lit: projected input initialFocus=${initialFocus} participates in the trap`, async ({ page }) => {
      await prepare(page, "lit");
      await page.evaluate(target => {
        const host = document.querySelector("fsds-dialog") as HTMLElement & {
          open: boolean; initialFocus: string; onOpenChange: (open: boolean) => void;
        };
        const input = document.createElement("input");
        input.id = "profile-slot";
        input.setAttribute("aria-label", "Slotted profile");
        host.append(input);
        host.initialFocus = target;
        host.onOpenChange = open => { host.open = open; };
        document.getElementById("focus-launcher")!.onclick = () => { host.open = true; };
      }, initialFocus);
      const launcher = page.locator("#focus-launcher");
      await launcher.click();
      const input = page.getByRole("textbox", { name: "Slotted profile" });
      const close = page.getByRole("button", { name: "Close dialog" });
      await expect(input).toBeFocused();
      await input.fill("Ada");
      await expect(input).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(input).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.locator(panel("lit"))).toHaveCount(0);
      await expect(launcher).toBeFocused();
    });
  }

  test("lit: a projected package Input is focused through its own shadow root", async ({ page }) => {
    await prepare(page, "lit");
    await page.evaluate(async () => {
      const entry = "/packages/ds-lit/src/components/Input/Input.ts";
      await import(entry);
      document.getElementById("focus-launcher")!.onclick = () => {
        const host = document.createElement("fsds-dialog") as HTMLElement & {
          open: boolean; initialFocus: string; onOpenChange: (open: boolean) => void;
        };
        const input = document.createElement("fsds-input") as HTMLElement & { name: string };
        input.name = "slotted-profile";
        host.initialFocus = 'input[name="slotted-profile"]';
        host.open = true;
        host.onOpenChange = open => { host.open = open; if (!open) host.remove(); };
        host.append(input);
        document.body.append(host);
      };
    });
    const launcher = page.locator("#focus-launcher");
    await launcher.click();
    const input = page.locator('fsds-input >> input[name="slotted-profile"]');
    await expect(input).toBeFocused();
    await input.fill("Ada");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Close dialog" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(input).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(launcher).toBeFocused();
  });

  test("React showcase: conditional composition opening survives its portal mount", async ({ page }) => {
    await page.goto("/#/component/Dialog/design");
    await page.getByRole("button", { name: "Open dialog", exact: true }).nth(1).click();
    const dialog = page.getByRole("dialog", { name: "Edit profile" });
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(150);
    await expect(dialog.getByRole("button", { name: "Close dialog" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open dialog", exact: true }).nth(1)).toBeFocused();
  });
});
