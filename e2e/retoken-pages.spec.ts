import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

for (const kind of ['spotify','pinterest']) {
  for (const width of [1440,390]) {
    test(`${kind}: composition and controls at ${width}px`, async ({page}, info) => {
      const errors:string[]=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.setViewportSize({width,height:1000});
      await page.goto(`/e2e/fixtures/retoken-pages/index.html?page=${kind}`);
      await expect(page.locator('.retoken')).toBeVisible();
      await expect.poll(()=>page.locator('img').evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
      expect(await page.locator('.icon svg').count()).toBe(await page.locator('.icon').count());
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const media=await page.locator('img').evaluateAll(imgs=>imgs.map(img=>{
        const css=getComputedStyle(img);const box=img.getBoundingClientRect();
        return {alt:img.getAttribute('alt'),authoredWidth:img.getAttribute('width'),authoredHeight:img.getAttribute('height'),width:box.width,height:box.height,aspectRatio:css.aspectRatio,objectFit:css.objectFit,objectPosition:css.objectPosition};
      }));
      await info.attach('media-facts',{body:JSON.stringify(media,null,2),contentType:'application/json'});
      await writeFile(info.outputPath('media-facts.json'),JSON.stringify(media,null,2));
      await page.screenshot({path:info.outputPath(`${kind}-${width}.png`),fullPage:true});
      if(kind==='spotify') {
        for(const thumbnail of await page.locator('.library img, .player img').all()) {
          await expect(thumbnail).toHaveCSS('width','48px');
          await expect(thumbnail).toHaveCSS('height','48px');
        }
        for(const cover of await page.locator('.album img').all()) {
          const box=(await cover.boundingBox())!;
          expect(box.width/box.height).toBeCloseTo(1,2);
          await expect(cover).toHaveCSS('object-fit','cover');
        }
        expect((await page.locator('.player').boundingBox())!.height).toBeLessThan(170);
        await expect(page.locator('.album').first()).toHaveCSS('border-width','0px');
        await expect(page.locator('.album').first()).toHaveCSS('background-color','rgb(24, 24, 24)');
        const homeAlign=await page.evaluate(()=>{
          const heading=document.querySelector('.home-links h1')!.getBoundingClientRect();
          const home=document.querySelector('.home-links .button')!.getBoundingClientRect();
          return Math.abs(heading.x-home.x);
        });
        expect(homeAlign).toBeLessThanOrEqual(2);
        for(const pick of await page.locator('.quick-pick .button').all()) {
          expect(await pick.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(0);
        }
        await page.getByRole('button',{name:'Play',exact:true}).click();
        await expect(page.getByRole('button',{name:'Pause',exact:true})).toHaveAttribute('aria-pressed','true');
        await page.getByRole('button',{name:'Pause',exact:true}).press('Space');
        await expect(page.getByRole('button',{name:'Play',exact:true})).toHaveAttribute('aria-pressed','false');
        await page.getByRole('button',{name:'Next mix'}).click();
        await expect(page.locator('.player')).toContainText('Rooms for reading');
        await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','36');
        await page.getByRole('textbox',{name:'Search collection'}).fill('Blue hour');
        await expect(page.locator('.album')).toHaveCount(1);
      } else {
        for(const [id,ratio] of [[0,2/3],[1,1],[3,4/3]]) {
          const box=(await page.locator(`[data-testid="pin-${id}"] img`).boundingBox())!;
          expect(box.width/box.height).toBeCloseTo(ratio,2);
        }
        await expect(page.locator('.pin-profile')).toHaveCSS('width','32px');
        await expect(page.locator('.pin .card__media').first()).toHaveCSS('border-radius','16px');
        await expect(page.locator('.pin-caption-copy .text').first()).toHaveCSS('text-overflow','ellipsis');
        const save=page.getByRole('button',{name:'Save Fieldwork — an independent design studio portfolio',exact:true});
        await save.focus();
        await expect(save).toBeVisible();
        await save.press('Enter');
        await expect(page.getByRole('button',{name:'Unsave Fieldwork — an independent design studio portfolio'})).toHaveAttribute('aria-pressed','true');
        await page.getByRole('button',{name:'Saved (1)',exact:true}).click();
        await expect(page.locator('.pin')).toHaveCount(1);
        await page.getByRole('button',{name:'Unsave Fieldwork — an independent design studio portfolio'}).focus();
        await page.getByRole('button',{name:'Unsave Fieldwork — an independent design studio portfolio'}).press('Enter');
        await expect(page.getByRole('status')).toHaveText('No ideas found');
        await page.getByRole('button',{name:'Home',exact:true}).click();
        await page.getByRole('textbox',{name:'Search collection'}).fill('Designing systems');
        await expect(page.locator('.pin')).toHaveCount(1);
        if(width===390) {
          for(const save of await page.locator('.save-button').all()) {
            expect((await save.boundingBox())!.height).toBeLessThanOrEqual(44);
          }
        }
        await page.getByRole('button',{name:'More options for Designing systems that leave room for change',exact:true}).click();
        const hide=page.getByRole('button',{name:'Hide this Pin',exact:true});
        await expect(hide).toBeVisible();
        await expect(hide).toHaveCSS('border-width','0px');
        await expect(hide).toHaveCSS('font-size','14px');
        await page.keyboard.press('Escape');
        await expect(hide).toBeHidden();
      }
      await page.getByRole('textbox',{name:'Search collection'}).fill('unmatched search');
      await expect(page.getByRole('status')).toHaveText(kind==='spotify'?'No mixes found':'No ideas found');
      expect(errors).toEqual([]);
    });
  }
}


for (const width of [1440,390]) {
  test(`Pin opens its detail, retains local interactions and returns at ${width}px`, async ({page},info)=>{
    const title='Fieldwork — an independent design studio portfolio';
    await page.setViewportSize({width,height:1000});
    await page.goto('/e2e/fixtures/retoken-pages/index.html?page=pinterest');
    const open=page.getByRole('link',{name:'Open '+title,exact:true});
    await open.focus();
    await open.press('Enter');
    await expect(page).toHaveURL(/pin=0/);
    const detail=page.getByRole('region',{name:'Pin details'});
    await expect(detail.getByRole('heading',{name:title})).toBeFocused();
    await expect(page.locator('.pin-detail-art img')).toHaveAttribute('alt',title);
    await expect(detail.locator('.avatar')).toHaveCSS('width','24px');
    await expect(page.getByRole('complementary',{name:'Related Pins'}).locator('.pin')).toHaveCount(17);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const railTexts=await page.getByRole('complementary',{name:'Related Pins'}).locator('img').evaluateAll(imgs=>imgs.map(img=>decodeURIComponent((img as HTMLImageElement).src.replace('data:image/svg+xml,','')).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()));
    expect(new Set(railTexts).size).toBe(railTexts.length);
    const commentGap=await page.evaluate(()=>{
      const notes=document.querySelectorAll('.pin-comments .text');
      const last=notes[notes.length-1]!.getBoundingClientRect();
      const form=document.querySelector('.pin-comment-form')!.getBoundingClientRect();
      return form.top-last.bottom;
    });
    expect(commentGap).toBeLessThanOrEqual(24);
    await page.screenshot({path:info.outputPath(`pin-detail-${width}.png`),fullPage:true});
    await detail.getByRole('button',{name:'Save '+title,exact:true}).click();
    await detail.getByRole('button',{name:'Like '+title,exact:true}).click();
    await expect(detail.getByRole('button',{name:'Like '+title,exact:true})).toHaveAttribute('aria-pressed','true');
    await detail.getByRole('button',{name:'Choose board'}).click();
    await page.getByRole('button',{name:'Studio references',exact:true}).click();
    await expect(detail).toContainText('Saved to Studio references');
    await detail.getByRole('textbox',{name:'Add a comment'}).fill('The typography and spacing work well together.');
    await detail.getByRole('button',{name:'Post comment'}).click();
    await expect(detail).toContainText('Comments (1)');
    await expect(detail).toContainText('The typography and spacing work well together.');
    await expect(detail.getByRole('textbox',{name:'Add a comment'})).toHaveValue('');
    await page.goBack();
    await expect(page).not.toHaveURL(/pin=/);
    await expect(open).toBeFocused();
    await expect(page.getByRole('button',{name:'Saved (1)',exact:true})).toBeVisible();
    await open.click();
    await expect(detail).toContainText('Comments (1)');
    await expect(detail.getByRole('button',{name:'Unsave '+title,exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('complementary',{name:'Related Pins'}).getByRole('link').first().click();
    await expect(page).toHaveURL(/pin=1/);
    await expect(detail.getByRole('heading')).toHaveText('Designing systems that leave room for change');
    await page.getByRole('button',{name:'Back to feed',exact:true}).click();
    await expect(page.locator('.pin-detail-layout')).toHaveCount(0);
    await page.getByRole('button',{name:'More options for '+title,exact:true}).click();
    await page.getByRole('button',{name:'Hide this Pin',exact:true}).click();
    await expect(open).toHaveCount(0);
  });
}

test('Pin links support direct loading and reject an out-of-range selection',async({page})=>{
  await page.goto('/e2e/fixtures/retoken-pages/index.html?page=pinterest&pin=2');
  await expect(page.getByRole('region',{name:'Pin details'}).getByRole('heading')).toHaveText('Material futures: an editorial identity');
  await page.goto('/e2e/fixtures/retoken-pages/index.html?page=pinterest&pin=999');
  await expect(page.locator('.pin-detail-layout')).toHaveCount(0);
  await expect(page.locator('.pin')).toHaveCount(18);
});
