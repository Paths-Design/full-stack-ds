import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The CSS fixture isolates the cascade from app styles and the global token
// sheet. The second suite exercises actual generated framework components.
function fixtureCss() {
  const base = resolve('packages/ds-react/src');
  return [readFileSync(`${base}/primitives/box-model.css`, 'utf8'),
    ...['Card','Button'].flatMap(name => ['tokens.css','css'].map(ext =>
      readFileSync(`${base}/components/${name}/${name}.${ext}`, 'utf8').replace(/^@import[^;]+;/gm,'')))].join('\n');
}

test('shared box controls preserve defaults, support shorthand and sides, and isolate nested components', async ({page}) => {
  await page.setContent('<div class="card" data-fsds-box="" data-fsds-component="card"><div class="card__media">Media</div><button class="button" data-fsds-box="" data-fsds-component="button">Nested</button></div><div class="card" data-fsds-box="" data-fsds-component="card">Sibling</div>');
  await page.addStyleTag({content: fixtureCss()});
  const card = page.locator('.card').first();
  const button = page.locator('.button');
  await expect(card).toHaveCSS('padding-top','16px');
  await expect(button).toHaveCSS('padding', '4px 8px');
  const buttonPadding = '4px 8px';
  await card.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-box-model-padding','20px 30px'));
  await expect(card).toHaveCSS('padding-top','20px');
  await expect(card).toHaveCSS('padding-left','30px');
  await card.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-box-model-padding-inline-start','7px'));
  await expect(card).toHaveCSS('padding-left','7px');
  await expect(card).toHaveCSS('padding-right','30px');
  await expect(button).toHaveCSS('padding',buttonPadding);
  await expect(page.locator('.card').nth(1)).toHaveCSS('padding-top','16px');
  await card.evaluate(el => (el as HTMLElement).style.removeProperty('--fsds-box-model-padding-inline-start'));
  await expect(card).toHaveCSS('padding-left','30px');
  await card.evaluate(el => (el as HTMLElement).style.removeProperty('--fsds-box-model-padding'));
  await expect(card).toHaveCSS('padding','16px');
});

test('part overrides stay independent with missing semantic tokens and consumer layers win', async ({page}) => {
  await page.setContent('<div class="card" data-fsds-box="" data-fsds-component="card"><div class="card__media">Media</div></div>');
  await page.addStyleTag({content:fixtureCss()});
  await expect(page.locator('.card')).toHaveCSS('border-radius','8px');
  await expect(page.locator('.card__media')).toHaveCSS('border-radius','8px');
  await page.addStyleTag({content:'[data-fsds-component="card"] { --fsds-card-design-media-shape-radius: 23px; --fsds-box-model-gap: 19px; }'});
  await expect(page.locator('.card__media')).toHaveCSS('border-radius','23px');
  await expect(page.locator('.card')).toHaveCSS('border-radius','8px');
  await expect(page.locator('.card')).toHaveCSS('gap','19px');
  await page.addStyleTag({content:'.card { border-width: 5px; }'});
  await expect(page.locator('.card')).toHaveCSS('border-top-width','5px');
});

for (const framework of ['react','vue','svelte','angular','lit']) {
  test(`${framework}: generated Button accepts and clears an unset design property`, async ({page}) => {
    await page.goto(`/preview/${framework}/Button`);
    await page.locator('body[data-fsds-ready]').waitFor();
    const button = page.locator('.button').first();
    await expect(button).toBeVisible();
    const baseline = await button.evaluate(el => getComputedStyle(el).borderTopWidth);
    await button.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-button-design-root-border-width','7px'));
    await expect(button).toHaveCSS('border-top-width','7px');
    await button.evaluate(el => (el as HTMLElement).style.removeProperty('--fsds-button-design-root-border-width'));
    await expect(button).toHaveCSS('border-top-width',baseline);
    await button.click();
    await expect(button).toBeVisible();
  });
}

for (const framework of ['react','vue','svelte','angular','lit']) {
  test(`${framework}: Card spacing accepts component and shared overrides`, async ({page}) => {
    await page.goto(`/preview/${framework}/Card`);
    await page.locator('body[data-fsds-ready]').waitFor();
    const card = page.locator('.card').first();
    const boundary = page.locator('[data-fsds-component="card"]').first();
    await expect(card).toHaveAttribute('data-fsds-box','');
    // The preview loads tokens and the default brand, unlike fixtureCss above.
    await expect(card).toHaveCSS('gap','12px');
    await boundary.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-card-design-root-spacing-gap','37px'));
    await expect(card).toHaveCSS('gap','37px');
    await boundary.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-box-model-gap','23px'));
    await expect(card).toHaveCSS('gap','23px');
    await boundary.evaluate(el => (el as HTMLElement).style.removeProperty('--fsds-box-model-gap'));
    await expect(card).toHaveCSS('gap','37px');
    await boundary.evaluate(el => (el as HTMLElement).style.removeProperty('--fsds-card-design-root-spacing-gap'));
    await expect(card).toHaveCSS('gap','12px');
    await boundary.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-box-model-padding','9px 11px'));
    await expect(card).toHaveCSS('padding','9px 11px');
  });
}

test('inspector exposes a formerly fixed property and clearing it restores the rendered default', async ({page}, info) => {
  await page.goto('/#/scratch/properties-panel');
  await expect(page.locator('.fsds-pp__title')).toHaveText('Button');
  const button = page.frameLocator('iframe').first().locator('.button').first();
  await expect(button).toBeVisible();
  const baseline = await button.evaluate(el => getComputedStyle(el).borderTopWidth);
  const input = page.getByLabel('button.design.root.border.width value', {exact:true});
  await expect(input).toHaveAttribute('data-fsds-component', 'input');
  await input.fill('6px');
  await expect(button).toHaveCSS('border-top-width','6px');
  const scope = page.getByRole('combobox', {name:'Part / condition', exact:true});
  await expect(scope).toContainText('root');
  await scope.getByRole('button', {name:'Part / condition', exact:true}).click();
  const alternate = page.getByRole('option').filter({hasNotText:/^root$/}).first();
  const alternateLabel = (await alternate.textContent())?.trim() ?? '';
  expect(alternateLabel).toMatch(/\S/);
  await alternate.click();
  await expect(scope).toContainText(alternateLabel);
  await expect(input).toHaveCount(0);
  await scope.getByRole('button', {name:'Part / condition', exact:true}).press('ArrowDown');
  await page.getByRole('option', {name:'root', exact:true}).click();
  await expect(scope).toContainText('root');
  await expect(input).toHaveValue('6px');
  await input.fill('');
  await expect(button).toHaveCSS('border-top-width',baseline);
  await input.blur();
  await page.getByRole('region', {name:'Design properties', exact:true}).screenshot({path:info.outputPath('design-properties-inspector.png'), animations:'disabled'});
});

for (const framework of ['react','vue','svelte','angular','lit']) {
  test(`${framework}: nearer consumer scopes override inherited brand design values`, async ({page}) => {
    await page.goto(`/preview/${framework}/Card`);
    await page.locator('body[data-fsds-ready]').waitFor();
    const card = page.locator('.card').first();
    const boundary = page.locator('[data-fsds-component="card"]').first();
    for (const brand of [null, 'forest']) {
      const radius = brand === 'forest' ? '24px' : '12px';
      for (const theme of ['light', 'dark']) {
        await page.evaluate(({brand, theme}) => {
          if (brand) document.documentElement.setAttribute('data-brand', brand);
          else document.documentElement.removeAttribute('data-brand');
          document.documentElement.setAttribute('data-theme', theme);
        }, {brand, theme});
        await expect(card).toHaveCSS('border-radius', radius);
        await page.evaluate(() => document.body.style.setProperty('--fsds-card-design-root-shape-radius', '29px'));
        await expect(card).toHaveCSS('border-radius', '29px');
        await boundary.evaluate(el => (el as HTMLElement).style.setProperty('--fsds-card-design-root-shape-radius', '35px'));
        await expect(card).toHaveCSS('border-radius', '35px');
        await boundary.evaluate(el => (el as HTMLElement).style.removeProperty('--fsds-card-design-root-shape-radius'));
        await expect(card).toHaveCSS('border-radius', '29px');
        await page.evaluate(() => document.body.style.removeProperty('--fsds-card-design-root-shape-radius'));
        await expect(card).toHaveCSS('border-radius', radius);
      }
    }
  });

  test(`${framework}: Switch still changes state after design migration`, async ({page}) => {
    await page.goto(`/preview/${framework}/Switch`);
    await page.locator('body[data-fsds-ready]').waitFor();
    const control = page.getByRole('switch').first();
    await expect(control).not.toBeChecked();
    await page.locator('.switch__track').first().click();
    await expect(control).toBeChecked();
    await control.focus();
    await control.press('Space');
    await expect(control).not.toBeChecked();
  });
}

test('composed default and retokened components remain usable', async ({page}, info) => {
  await page.setViewportSize({width:1120,height:850});
  await page.goto('/preview/react/Card');
  await page.locator('body[data-fsds-ready]').waitFor();
  await page.evaluate(async () => {
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    // Served by Vite from this repository; this is a real generated-component consumer.
    const url = '/e2e/fixtures/design-bindings-gallery.tsx';
    const gallery = await import(/* @vite-ignore */ url);
    gallery.mount(host);
  });
  await expect(page.getByRole('heading',{name:'Component design bindings'})).toBeVisible();
  await page.getByRole('textbox',{name:'Retokened collection name'}).fill('Field notes');
  await expect(page.getByRole('textbox',{name:'Retokened collection name'})).toHaveValue('Field notes');
  await page.locator('.retokened .switch__track').click();
  await expect(page.getByRole('switch',{name:'Retokened notifications'})).toBeChecked();
  await page.locator('.retokened').getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.locator('.retokened').getByRole('button',{name:'Saved',exact:true})).toBeVisible();
  await expect(page.locator('.retokened .card')).toHaveCSS('border-radius','24px');
  await expect(page.locator('.retokened .card__media')).toHaveCSS('border-radius','16px');
  await expect(page.locator('.retokened .card')).toHaveCSS('background-color','rgb(30, 52, 58)');
  await page.getByRole('heading',{name:'Component design bindings'}).hover();
  await expect(page.locator('.retokened .card')).toHaveCSS('background-color','rgb(22, 38, 43)');
  await page.screenshot({path:info.outputPath('design-bindings-gallery.png'),fullPage:true,animations:'disabled'});
});
