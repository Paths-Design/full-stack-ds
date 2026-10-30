import { expect, test, type Page } from '@playwright/test';

const options = [{ value: 'red', label: 'Red' }, { value: 'grey', label: 'Unavailable', disabled: true }, { value: 'blue', label: 'Blue' }];
async function configure(page: Page, props: Record<string, unknown>) {
  await page.evaluate(props => window.postMessage({ type: 'fsds:config', props }, '*'), props);
}

for (const framework of ['react', 'vue', 'svelte', 'angular', 'lit']) {
  test(`${framework}: typed Input retains intrinsic number and color semantics`, async ({ page }) => {
    await page.goto(`/preview/${framework}/Input`);
    await page.locator('body[data-fsds-ready]').waitFor();
    await configure(page, { type: 'number', ariaLabel: 'Count' });
    const number = page.getByRole('spinbutton', { name: 'Count' });
    await expect(number).not.toHaveAttribute('role');
    await number.fill('42');
    await expect(number).toHaveValue('42');
    await configure(page, { type: 'color', ariaLabel: 'Ink', value: '#123456' });
    const color = page.locator('input[aria-label="Ink"]');
    await expect(color).toHaveAttribute('type', 'color');
    await expect(color).not.toHaveAttribute('role');
    await expect(color).toHaveValue('#123456');
  });

  test(`${framework}: RadioGroup uses native keyboard selection and skips disabled options`, async ({ page }, info) => {
    await page.goto(`/preview/${framework}/RadioGroup`);
    await page.locator('body[data-fsds-ready]').waitFor();
    await configure(page, { name: 'colors', ariaLabel: 'Colors', options });
    const red = page.getByRole('radio', { name: 'Red', exact: true });
    const blue = page.getByRole('radio', { name: 'Blue', exact: true });
    await red.check();
    await expect(red).toBeChecked();
    await red.focus();
    await page.keyboard.press('ArrowRight');
    await expect(blue).toBeFocused();
    await expect(blue).toBeChecked();
    await expect(red).not.toBeChecked();
    await expect(page.getByRole('radio', { name: 'Unavailable' })).toBeDisabled();
    await page.keyboard.press('ArrowRight');
    await expect(red).toBeFocused();
    await expect(red).toBeChecked();
    await page.screenshot({ animations: 'disabled', path: info.outputPath(`${framework}-radio-group.png`) });
  });

  test(`${framework}: Select labels, disabled options and single/multiple dismissal`, async ({ page }, info) => {
    await page.goto(`/preview/${framework}/Select`);
    await page.locator('body[data-fsds-ready]').waitFor();
    await configure(page, { options, triggerLabel: 'Color', placeholder: 'Choose', defaultOpen: false });
    const trigger = page.getByRole('combobox', { name: 'Color', exact: true });
    await expect(trigger).toHaveText('Choose');
    if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
    await page.getByRole('option', { name: 'Red', exact: true }).click();
    await expect(trigger).toHaveText('Red');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole('option', { name: 'Red', exact: true }).click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await trigger.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Red', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Blue', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveText('Blue');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await configure(page, { options, triggerLabel: 'Color', multiple: true, placeholder: 'Choose', defaultValue: 'blue', defaultOpen: false });
    await trigger.click();
    await page.getByRole('option', { name: 'Red', exact: true }).click();
    await expect(trigger).toHaveText('Red, Blue');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('option', { name: 'Unavailable' })).toBeDisabled();
    await page.screenshot({ animations: 'disabled', path: info.outputPath(`${framework}-select.png`) });
  });
}

test('showcase uses shared brands, inspector choices and annotated code', async ({ page }, info) => {
  await page.setViewportSize({ width: 1153, height: 943 });
  await page.goto('/#/tokens');
  const brands = page.getByRole('radiogroup', { name: 'Active brand' });
  await expect(brands).toHaveAttribute('data-fsds-component', 'radio-group');
  await brands.getByRole('radio', { name: /^corporate$/i }).check();
  await page.getByRole('button', { name: 'Appearance settings' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Brand theme' })).toHaveAttribute('data-fsds-component', 'radio-group');
  await page.screenshot({ animations: 'disabled', path: info.outputPath('brand-settings.png') });
  await page.goto('/#/component/Card/design');
  const density = page.locator('.fsds-pp').getByRole('combobox', { name: 'density', exact: true });
  await density.click();
  await page.getByRole('option', { name: 'inset', exact: true }).click();
  await expect(density).toHaveText('inset');
  await expect(page.locator('[data-usage-preview] [data-fsds-component="card"]').first()).toHaveClass(/card--inset/);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('inspector-choice.png') });
  await page.getByRole('button', { name: 'Edit card.color.background.default', exact: true }).click();
  const color = page.locator('.fsds-tvc__popover input[aria-label="card.color.background.default color"]');
  await expect(color).toHaveAttribute('data-fsds-component', 'input');
  const swatch = await color.boundingBox();
  expect(swatch!.width).toBe(swatch!.height);
  await color.fill('#123456');
  await expect(page.locator('[data-usage-preview] [data-fsds-component="card"]').first()).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await page.screenshot({ animations: 'disabled', path: info.outputPath('color-editor.png') });
  await page.goto('/#/component/Button/developer');
  const source = page.locator('.source-viewer__code').first();
  await expect(source).toHaveAttribute('data-fsds-component', 'code-block');
  const lineHeights = await source.locator(".source-viewer__line").evaluateAll(lines => lines.map(line => line.getBoundingClientRect().height));
  expect(Math.max(...lineHeights) - Math.min(...lineHeights)).toBeLessThanOrEqual(1);
  const hit = source.locator('[data-hit-index]').first();
  await expect(hit).toHaveAttribute('data-fsds-component', 'button');
  await hit.click();
  await expect(hit).toHaveAttribute('data-selected', 'true');
  await source.scrollIntoViewIfNeeded();
  await page.screenshot({ animations: 'disabled', path: info.outputPath('annotated-code.png') });
});
