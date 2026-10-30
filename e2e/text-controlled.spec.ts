import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

async function configure(page: Page, controlled: boolean, value = "alpha", type = "text") {
  await page.evaluate(({ controlled, value, type }) => {
    const state = window as unknown as { textRequests: string[] };
    state.textRequests = [];
    const props = { type, ariaLabel: "Release text", ...(controlled ? { value } : { defaultValue: value }),
      onChange(next: string) { state.textRequests.push(next); },
    };
    window.dispatchEvent(new MessageEvent("message", { data: { type: "fsds:config", props } }));
  }, { controlled, value, type });
}
const requests = (page: Page) => page.evaluate(() => (window as unknown as { textRequests: string[] }).textRequests);

for (const framework of ["react", "vue", "svelte", "angular", "lit"]) {
  for (const component of ["Input", "TextField"]) {
    test(`${framework} ${component}: refusal restores accepted text once and retains focus`, async ({ page }, info) => {
      const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
      await page.goto(`/preview/${framework}/${component}`);
      await page.locator("body[data-fsds-ready]").waitFor();
      await configure(page, true);
      const input = page.locator("input");
      await expect(input).toHaveValue("alpha");
      await input.fill("changed");
      await expect(input).toHaveValue("alpha"); await expect(input).toBeFocused();
      await expect.poll(() => requests(page)).toEqual(["changed"]);
      expect(errors).toEqual([]);
      await page.screenshot({ path: info.outputPath(`${framework}-${component}-refusal.png`) });
    });
    test(`${framework} ${component}: uncontrolled edits retain native caret and commit once`, async ({ page }) => {
      await page.goto(`/preview/${framework}/${component}`);
      await page.locator("body[data-fsds-ready]").waitFor();
      await configure(page, false, "");
      const input = page.locator("input"); await expect(input).toHaveValue("");
      await input.fill("alpha"); await expect(input).toHaveValue("alpha");
      await input.focus(); await input.evaluate((element: HTMLInputElement) => element.setSelectionRange(2, 2));
      await page.keyboard.type("X");
      await expect(input).toHaveValue("alXpha"); await expect(input).toBeFocused();
      expect(await input.evaluate((element: HTMLInputElement) => element.selectionStart)).toBe(3);
      await expect.poll(() => requests(page)).toEqual(["alpha", "alXpha"]);
    });
  }
  test(`${framework} Input: Chromium composition retains a draft and reconciles the committed value`, async ({ page }, info) => {
    await page.goto(`/preview/${framework}/Input`);
    await page.locator("body[data-fsds-ready]").waitFor(); await configure(page, true, "");
    const input = page.locator("input"); await expect(input).toHaveValue(""); await input.focus();
    await input.evaluate(element => {
      const state = window as unknown as { nativeTextEvents: unknown[] }; state.nativeTextEvents = [];
      for (const name of ["compositionstart", "compositionupdate", "compositionend", "input"]) {
        element.addEventListener(name, event => state.nativeTextEvents.push({ type: event.type,
          trusted: event.isTrusted, composing: (event as InputEvent).isComposing,
          data: (event as InputEvent).data, value: (event.target as HTMLInputElement).value }));
      }
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.imeSetComposition", { text: "に", selectionStart: 1, selectionEnd: 1 });
    const draft = await input.inputValue();
    await cdp.send("Input.insertText", { text: "日本" });
    await expect(input).toHaveValue(""); await expect(input).toBeFocused();
    const events = await page.evaluate(() => (window as unknown as { nativeTextEvents: unknown[] }).nativeTextEvents);
    await writeFile(info.outputPath("composition-events.json"), JSON.stringify({ draft, requests: await requests(page), events }, null, 2));
    await expect.poll(() => requests(page)).toEqual(["に", "日本"]);
    expect(draft).toBe("に");
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "input", trusted: true, composing: true })]));
    await cdp.detach();
  });
}

test("svelte: a real parent accepts edits and later state on the identical mounted input", async ({ page }) => {
  await page.goto("/preview/svelte/Input"); await page.locator("body[data-fsds-ready]").waitFor();
  await page.evaluate(async () => {
    const path = "/e2e/fixtures/text-controlled/consumer.ts"; const { mountParent } = await import(path);
    const host = document.createElement("div"); host.id = "same-input-parent"; document.body.append(host);
    const state = window as unknown as { textRequests: string[]; textParent: { setValue(value: string): void; setAccepting(value: boolean): void } };
    state.textRequests = []; state.textParent = mountParent(host, (value: string) => state.textRequests.push(value));
  });
  const input = page.locator("#same-input-parent input"); await expect(input).toHaveValue("alpha");
  const original = await input.elementHandle();
  await input.fill("refused"); await expect(input).toHaveValue("alpha"); await expect(input).toBeFocused();
  await page.evaluate(() => (window as unknown as { textParent: { setAccepting(value: boolean): void } }).textParent.setAccepting(true));
  await input.fill("accepted"); await expect(input).toHaveValue("accepted"); await expect(input).toBeFocused();
  await page.evaluate(() => (window as unknown as { textParent: { setValue(value: string): void } }).textParent.setValue("later"));
  await expect(input).toHaveValue("later"); await expect(input).toBeFocused();
  expect(await input.evaluate((element, original) => element === original, original)).toBe(true);
  expect(await requests(page)).toEqual(["refused", "accepted"]);
});
