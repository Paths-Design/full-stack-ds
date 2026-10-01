import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

function focusSlot(component: string, property: string): string {
  const styles = JSON.parse(readFileSync(`packages/ds-contracts/components/${component}/${component}.styles.json`, 'utf8'));
  const selector = Object.keys(styles).find(key => key.includes('focus-visible'))!;
  return '--fsds-' + styles[selector][property].design.slot.replaceAll('.', '-');
}

for (const framework of ['react', 'vue', 'svelte', 'angular', 'lit']) {
  for (const component of ['Details', 'Switch']) {
    test(`${framework}: ${component} shared focus, independent override and clearing`, async ({ page }) => {
      await page.goto(`/preview/${framework}/${component}`);
      await page.locator('body[data-fsds-ready]').waitFor();
      const root = page.locator(component === 'Details' ? '.details' : '.switch').first();
      const control = root.locator(component === 'Details' ? '.details__summary' : '.switch__input');
      const paint = root.locator(component === 'Details' ? '.details__summary' : '.switch__track');
      await control.focus();
      const original = await paint.evaluate(el => ({ outline: getComputedStyle(el).outline, offset: getComputedStyle(el).outlineOffset }));
      await root.evaluate(el => {
        const style = (el as HTMLElement).style;
        style.setProperty('--fsds-semantic-focus-ring-color', 'rgb(0, 128, 64)');
        style.setProperty('--fsds-semantic-focus-ring-width', '7px');
        style.setProperty('--fsds-semantic-focus-ring-offset', '9px');
        style.setProperty('--fsds-semantic-focus-ring-style', 'dashed');
      });
      await expect(paint).toHaveCSS('outline-color', 'rgb(0, 128, 64)');
      await expect(paint).toHaveCSS('outline-width', '7px');
      await expect(paint).toHaveCSS('outline-offset', '9px');
      await expect(paint).toHaveCSS('outline-style', 'dashed');
      if (framework === 'react') await page.screenshot({ path: `test-results/token-cohesion-${component}.png` });
      const slot = focusSlot(component, 'outline-color');
      await root.evaluate((el, name) => (el as HTMLElement).style.setProperty(name, 'rgb(128, 0, 255)'), slot);
      await expect(paint).toHaveCSS('outline-color', 'rgb(128, 0, 255)');
      await root.evaluate((el, name) => (el as HTMLElement).style.removeProperty(name), slot);
      await expect(paint).toHaveCSS('outline-color', 'rgb(0, 128, 64)');
      await root.evaluate(el => {
        for (const role of ['color', 'width', 'offset', 'style']) (el as HTMLElement).style.removeProperty(`--fsds-semantic-focus-ring-${role}`);
      });
      await expect(paint).toHaveCSS('outline', original.outline);
      await expect(paint).toHaveCSS('outline-offset', original.offset);
    });
  }
  for (const component of ['CodeBlock', 'CodeSnippet', 'Text']) {
    test(`${framework}: ${component} semantic mono family and independent override`, async ({ page }) => {
      await page.goto(`/preview/${framework}/${component}`);
      await page.locator('body[data-fsds-ready]').waitFor();
      if (component === 'Text') {
        await page.evaluate(() => window.postMessage({ type: 'fsds:config', props: { variant: 'code', as: 'span' } }, '*'));
        await expect(page.locator('.text--code')).toBeVisible();
      }
      const prefix = component === 'CodeBlock' ? 'code-block' : component === 'CodeSnippet' ? 'code-snippet' : 'text';
      const root = page.locator(`.${prefix}`).first();
      const original = await root.evaluate(el => getComputedStyle(el).fontFamily);
      const styles = JSON.parse(readFileSync(`packages/ds-contracts/components/${component}/${component}.styles.json`, 'utf8'));
      const slot = '--fsds-' + styles[component === 'Text' ? '--code' : 'root']['font-family'].design.slot.replaceAll('.', '-');
      await root.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-semantic-typography-semantic-family-mono', '"FSDS Shared Mono", monospace'));
      await expect(root).toHaveCSS('font-family', '"FSDS Shared Mono", monospace');
      await root.evaluate((el, name) => (el as HTMLElement).style.setProperty(name, '"FSDS Local Mono", monospace'), slot);
      await expect(root).toHaveCSS('font-family', '"FSDS Local Mono", monospace');
      await root.evaluate((el, name) => (el as HTMLElement).style.removeProperty(name), slot);
      await expect(root).toHaveCSS('font-family', '"FSDS Shared Mono", monospace');
      await root.evaluate(el => (el as HTMLElement).style.removeProperty('--fsds-semantic-typography-semantic-family-mono'));
      await expect(root).toHaveCSS('font-family', original);
    });
  }
  test(`${framework}: renamed Avatar base and explicit variant sizes retain defaults`, async ({ page }) => {
    await page.goto(`/preview/${framework}/Avatar`);
    await page.locator('body[data-fsds-ready]').waitFor();
    const avatar = page.locator('.avatar').first();
    for (const [size, width] of [['small', '16px'], ['medium', '24px'], ['large', '32px'], ['extra-large', '48px']]) {
      await page.evaluate(value => window.postMessage({ type: 'fsds:config', props: { size: value } }, '*'), size);
      await expect(avatar).toHaveCSS('width', width);
      await expect(avatar).toHaveCSS('height', width);
    }
    expect(await avatar.evaluate(el => getComputedStyle(el).getPropertyValue('--fsds-avatar-size-default').trim())).toBe('');
    await page.evaluate(() => window.postMessage({ type: 'fsds:config', props: { size: 'small' } }, '*'));
    await avatar.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-avatar-size-small', '37px'));
    await expect(avatar).toHaveCSS('width', '37px');
    await expect(avatar).toHaveCSS('height', '37px');
    await avatar.evaluate(el => (el as HTMLElement).style.removeProperty('--fsds-avatar-size-small'));
    await expect(avatar).toHaveCSS('width', '16px');
  });
  test(`${framework}: Button neutral gap remains live and old default alias is absent`, async ({ page }) => {
    await page.goto(`/preview/${framework}/Button`);
    await page.locator('body[data-fsds-ready]').waitFor();
    const button = page.locator('.button').first();
    const original = await button.evaluate(el => getComputedStyle(el).gap);
    expect(await button.evaluate(el => getComputedStyle(el).getPropertyValue('--fsds-button-size-gap-default').trim())).toBe('');
    await button.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-button-size-gap', '31px'));
    await expect(button).toHaveCSS('gap', '31px');
    await button.evaluate(el => (el as HTMLElement).style.removeProperty('--fsds-button-size-gap'));
    await expect(button).toHaveCSS('gap', original);
  });
}
