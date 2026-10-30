import { expect, test, type Page } from "@playwright/test";

const options = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta", disabled: true },
  { value: "gamma", label: "Gamma" },
];

test("svelte: a real parent accepts later updates on the same mounted radio inputs", async ({ page }, info) => {
  await page.goto("/preview/svelte/RadioGroup");
  await page.locator("body[data-fsds-ready]").waitFor();
  await page.evaluate(async () => {
    const path = "/e2e/fixtures/radio-controlled/consumer.ts";
    const { mountParent } = await import(path);
    const host = document.createElement("div");
    host.id = "same-instance-parent";
    document.body.append(host);
    const state = window as unknown as {
      radioRequests: string[];
      radioParent: { setValue(value: string): void; setAccepting(value: boolean): void };
      originalRadio: HTMLInputElement | null;
    };
    state.radioRequests = [];
    state.radioParent = mountParent(host, (value: string) => state.radioRequests.push(value));
  });
  const host = page.locator("#same-instance-parent");
  const alpha = host.getByRole("radio", { name: "Alpha", exact: true });
  const gamma = host.getByRole("radio", { name: "Gamma", exact: true });
  await expect(alpha).toBeChecked();
  await gamma.evaluate(element => {
    (window as unknown as { originalRadio: Element }).originalRadio = element;
  });
  await alpha.focus();
  await page.keyboard.press("ArrowRight");
  await expect(gamma).toBeFocused();
  await expect(alpha).toBeChecked();
  await expect(gamma).not.toBeChecked();
  await expect.poll(() => requests(page)).toEqual(["gamma"]);
  await page.evaluate(() => {
    const parent = (window as unknown as { radioParent: { setValue(value: string): void; setAccepting(value: boolean): void } }).radioParent;
    parent.setValue("gamma");
    parent.setAccepting(true);
  });
  await expect(gamma).toBeChecked();
  await expect(gamma).toBeFocused();
  await alpha.click();
  await expect(alpha).toBeChecked();
  await expect(alpha).toBeFocused();
  await expect(gamma).not.toBeChecked();
  await expect.poll(() => requests(page)).toEqual(["gamma", "alpha"]);
  expect(await gamma.evaluate(element => element === (window as unknown as { originalRadio: Element }).originalRadio)).toBe(true);
  await page.screenshot({ path: info.outputPath("svelte-same-instance-radio.png"), animations: "disabled" });
});

async function configure(page: Page, value?: string, accept = false) {
  await page.evaluate(({ options, value, accept }) => {
    const state = window as unknown as { radioRequests: string[] };
    state.radioRequests ??= [];
    const props = { name: "release-choice", ariaLabel: "Release choice", options, value,
      onChange(next: string) {
        state.radioRequests.push(next);
        if (accept) {
          props.value = next;
          window.dispatchEvent(new MessageEvent("message", { data: { type: "fsds:config", props: { ...props } } }));
        }
      },
    };
    // Direct same-realm dispatch preserves a real parent callback. Unlike
    // postMessage, it can carry functions into every framework's preview host.
    window.dispatchEvent(new MessageEvent("message", { data: { type: "fsds:config", props } }));
  }, { options, value, accept });
}

async function requests(page: Page) {
  return page.evaluate(() => (window as unknown as { radioRequests: string[] }).radioRequests);
}

for (const framework of ["react", "vue", "svelte", "angular", "lit"]) {
  test(`${framework}: controlled refusal restores checked peers without moving focus or duplicating requests`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`/preview/${framework}/RadioGroup`);
    await page.locator("body[data-fsds-ready]").waitFor();
    await configure(page, "alpha");
    const alpha = page.getByRole("radio", { name: "Alpha", exact: true });
    const gamma = page.getByRole("radio", { name: "Gamma", exact: true });
    await expect(alpha).toBeChecked();
    await expect(page.getByRole("radio", { name: "Beta", exact: true })).toBeDisabled();
    await alpha.focus();
    await page.keyboard.press("ArrowRight");
    await expect(gamma).toBeFocused();
    await expect(alpha).toBeChecked();
    await expect(gamma).not.toBeChecked();
    await expect(alpha).toHaveAttribute("aria-checked", "true");
    await expect(gamma).toHaveAttribute("aria-checked", "false");
    await expect.poll(() => requests(page)).toEqual(["gamma"]);

    await gamma.click();
    await expect(gamma).toBeFocused();
    await expect(alpha).toBeChecked();
    await expect(gamma).not.toBeChecked();
    await expect.poll(() => requests(page)).toEqual(["gamma", "gamma"]);

    // A later parent acceptance must remain renderable after reconciliation.
    await configure(page, "gamma", true);
    await expect(gamma).toBeChecked();
    await expect(alpha).not.toBeChecked();
    // External config remounts the Svelte preview; request-time focus was
    // checked above, before replacing any parent props.
    await alpha.click();
    await expect(alpha).toBeChecked();
    await expect(gamma).not.toBeChecked();
    await expect(alpha).toHaveAttribute("aria-checked", "true");
    await expect(gamma).toHaveAttribute("aria-checked", "false");
    await expect.poll(() => requests(page)).toEqual(["gamma", "gamma", "alpha"]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`${framework}-controlled-radio.png`), animations: "disabled" });
  });

  test(`${framework}: uncontrolled pointer and native arrows each commit once and skip disabled peers`, async ({ page }, info) => {
    await page.goto(`/preview/${framework}/RadioGroup`);
    await page.locator("body[data-fsds-ready]").waitFor();
    await configure(page);
    const alpha = page.getByRole("radio", { name: "Alpha", exact: true });
    const gamma = page.getByRole("radio", { name: "Gamma", exact: true });
    await alpha.click();
    await expect(alpha).toBeChecked();
    await expect.poll(() => requests(page)).toEqual(["alpha"]);
    await page.keyboard.press("ArrowRight");
    await expect(gamma).toBeFocused();
    await expect(gamma).toBeChecked();
    await expect(alpha).not.toBeChecked();
    await expect(gamma).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => requests(page)).toEqual(["alpha", "gamma"]);
    await page.keyboard.press("ArrowLeft");
    await expect(alpha).toBeFocused();
    await expect(alpha).toBeChecked();
    await expect(gamma).not.toBeChecked();
    await expect.poll(() => requests(page)).toEqual(["alpha", "gamma", "alpha"]);
    await page.screenshot({ path: info.outputPath(`${framework}-uncontrolled-radio.png`), animations: "disabled" });
  });
}
