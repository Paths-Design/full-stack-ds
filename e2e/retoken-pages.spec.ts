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
        await expect(page.getByRole('button',{name:'Soundroom home',exact:true})).toBeVisible();
        await expect(page.getByRole('button',{name:'Home',exact:true})).toBeVisible();
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
        await expect(page.locator('.pin-avatar-trigger .pin-profile')).toHaveCSS('width','32px');
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
        await page.getByRole('button',{name:'Search ideas',exact:true}).click();
        await page.getByRole('textbox',{name:'Search collection'}).fill('Designing systems');
        await page.getByRole('textbox',{name:'Search collection'}).press('Enter');
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
      if(kind==='pinterest')await page.getByRole('button',{name:'Search ideas',exact:true}).click();
      await page.getByRole('textbox',{name:'Search collection'}).fill('unmatched search');
      await expect(kind==='spotify'?page.getByRole('region',{name:'Music discovery'}).getByRole('status'):page.getByRole('status')).toHaveText(kind==='spotify'?'No mixes found':'No ideas found');
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

for (const width of [1440,390]) {
  test(`Album details keep browsing separate from playback at ${width}px`,async({page},info)=>{
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width,height:1000});
    await page.goto('/e2e/fixtures/retoken-pages/index.html?page=spotify');
    const open=page.getByRole('link',{name:'Open Slow mornings',exact:true});
    const player=page.locator('.player');
    await expect(player).toContainText('Blue hour');
    await open.focus();
    await open.press('Enter');
    await expect(page).toHaveURL(/page=spotify&album=0/);
    const detail=page.getByRole('region',{name:'Album details'});
    await expect(detail.getByRole('heading',{name:'Slow mornings',exact:true})).toBeFocused();
    await expect(detail).toContainText('Studio North');
    await expect(detail.getByRole('img',{name:'Slow mornings cover',exact:true})).toBeVisible();
    await expect(player).toContainText('Blue hour');
    await expect(player.getByRole('button',{name:'Play',exact:true})).toHaveAttribute('aria-pressed','false');
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:info.outputPath(`album-detail-${width}.png`),fullPage:true});

    await detail.getByRole('button',{name:'Save Slow mornings',exact:true}).click();
    await expect(detail.getByRole('button',{name:'Remove Slow mornings',exact:true})).toHaveAttribute('aria-pressed','true');
    await detail.getByRole('button',{name:'Play Slow mornings',exact:true}).click();
    await expect(detail.getByRole('button',{name:'Pause Slow mornings',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(player).toContainText('Studio North');
    await expect(player).toContainText('First light');
    await player.getByRole('button',{name:'Pause',exact:true}).press('Space');
    await expect(detail.getByRole('button',{name:'Play Slow mornings',exact:true})).toHaveAttribute('aria-pressed','false');
    await detail.getByRole('button',{name:'Play First light',exact:true}).click();
    await expect(player.getByRole('button',{name:'Pause',exact:true})).toHaveAttribute('aria-pressed','true');
    await player.getByRole('button',{name:'Next track',exact:true}).click();
    await expect(player).toContainText('An open window');
    await expect(player).toContainText('Studio North');
    await expect(player).toContainText('4:12');
    await player.getByRole('button',{name:'Previous track',exact:true}).click();
    await expect(player).toContainText('First light');
    await detail.getByRole('button',{name:'Play Coffee, slowly',exact:true}).click();
    await expect(player).toContainText('Coffee, slowly');
    await expect(player).toContainText('2:48');
    await detail.getByRole('button',{name:'Play First light',exact:true}).click();
    await expect(player).toContainText('First light');

    await page.goBack();
    await expect(detail).toHaveCount(0);
    await expect(open).toBeFocused();
    await expect(player).toContainText('First light');
    await expect(player.getByRole('button',{name:'Pause',exact:true})).toHaveAttribute('aria-pressed','true');
    await open.press('Enter');
    await expect(detail.getByRole('button',{name:'Remove Slow mornings',exact:true})).toHaveAttribute('aria-pressed','true');
    await detail.getByRole('button',{name:'Remove Slow mornings',exact:true}).click();
    await expect(detail.getByRole('button',{name:'Save Slow mornings',exact:true})).toHaveAttribute('aria-pressed','false');
    await page.getByRole('button',{name:'Back to discovery',exact:true}).click();
    await expect(open).toBeFocused();
    await open.click();
    await page.getByRole('button',{name:'Home',exact:true}).click();
    await expect(detail).toHaveCount(0);
    await expect(page).not.toHaveURL(/album=/);
    await expect(open).toBeFocused();
    await expect(player).toContainText('First light');
    expect(errors).toEqual([]);
  });

  test(`Music discovery search, profile and library controls at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000});
    await page.goto('/e2e/fixtures/retoken-pages/index.html?page=spotify');
    await expect(page.getByRole('region',{name:'Popular artists',exact:true})).toBeVisible();
    await expect(page.getByRole('region',{name:'Popular radio',exact:true})).toBeVisible();
    const search=page.getByRole('textbox',{name:'Search collection'});
    const suggestions=page.getByRole('region',{name:'Search suggestions'});
    await search.fill('Slow mornings');
    await expect(page.locator('.album')).toHaveCount(1);
    await expect(suggestions).toBeVisible();
    await search.press('Escape');
    await expect(suggestions).toBeHidden();
    await expect(search).toHaveValue('Slow mornings');
    await search.fill('Blue hour');
    await expect(suggestions).toBeVisible();
    await page.getByRole('button',{name:'Your profile',exact:true}).focus();
    await expect(suggestions).toBeHidden();
    await search.fill('Slow mornings');
    await suggestions.getByRole('button',{name:/Slow mornings/}).click();
    await expect(page.getByRole('region',{name:'Album details'}).getByRole('heading',{name:'Slow mornings',exact:true})).toBeFocused();
    await page.getByRole('button',{name:'Home',exact:true}).click();
    await expect(search).toHaveValue('');

    const profile=page.getByRole('button',{name:'Your profile',exact:true});
    await profile.focus();
    await profile.press('Enter');
    await expect(page.getByText('Your listening space',{exact:true})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Your listening space',{exact:true})).toBeHidden();
    await expect(profile).toBeFocused();
    if(width===1440) await page.locator('.library').getByRole('button',{name:'Artists',exact:true}).click();
    await profile.click();
    await page.getByRole('button',{name:'Recently played',exact:true}).click();
    await expect(page.getByText('Your listening space',{exact:true})).toBeHidden();
    await expect(page.locator('.library').getByRole('button',{name:'All',exact:true,includeHidden:true})).toHaveAttribute('aria-pressed','true');

    const library=page.locator('.library');
    if(width===1440) {
      const expanded=(await library.boundingBox())!;
      await page.getByRole('button',{name:'Collapse Your Library',exact:true}).hover();
      await expect(page.getByRole('tooltip')).toHaveText('Collapse Your Library');
      await page.getByRole('button',{name:'Collapse Your Library',exact:true}).click();
      await expect(page.getByRole('button',{name:'Expand Your Library',exact:true})).toHaveAttribute('aria-expanded','false');
      await expect.poll(async()=>(await library.boundingBox())!.width).toBeLessThan(expanded.width);
      await expect(page.locator('.library-expanded')).toBeHidden();
      await expect(library.getByRole('link',{name:'Open Slow mornings from library',exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Expand Your Library',exact:true}).press('Enter');
      await expect(page.getByRole('button',{name:'Collapse Your Library',exact:true})).toHaveAttribute('aria-expanded','true');
      await expect(page.locator('.library-expanded')).toBeVisible();
      await expect.poll(async()=>(await library.boundingBox())!.width).toBeCloseTo(expanded.width,0);
      await search.fill('Blue hour');
      await search.press('Escape');
      const libraryOpener=library.getByRole('link',{name:'Open Slow mornings from library',exact:true});
      await libraryOpener.focus();
      await libraryOpener.press('Enter');
      await page.getByRole('button',{name:'Back to discovery',exact:true}).click();
      await expect(page.getByRole('link',{name:'Open Slow mornings',exact:true})).toHaveCount(0);
      await expect(libraryOpener).toBeFocused();
    } else {
      await expect(library).toBeHidden();
    }
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test('Album links load directly and reject malformed or out-of-range selections',async({page})=>{
  await page.goto('/e2e/fixtures/retoken-pages/index.html?page=spotify&album=2');
  const detail=page.getByRole('region',{name:'Album details'});
  await expect(detail.getByRole('heading',{name:'Rooms for reading',exact:true})).toBeFocused();
  await expect(detail).toContainText('Forma Studio');
  await expect(page.locator('.player')).toContainText('Blue hour');
  for(const selection of ['999','-1','1.5','not-an-album']) {
    await page.goto(`/e2e/fixtures/retoken-pages/index.html?page=spotify&album=${selection}`);
    await expect(detail).toHaveCount(0);
    await expect(page.locator('.album')).toHaveCount(8);
  }
});

test('Music hover affordances respect reduced motion',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/e2e/fixtures/retoken-pages/index.html?page=spotify');
  const album=page.locator('.album-placement').filter({has:page.getByRole('link',{name:'Open Slow mornings',exact:true})});
  const play=album.getByRole('button',{name:'Play Slow mornings',exact:true});
  await expect(play).toHaveCSS('opacity','0');
  await album.getByRole('link',{name:'Open Slow mornings',exact:true}).focus();
  await expect(play).toHaveCSS('opacity','1');
  await page.getByRole('button',{name:'Your profile',exact:true}).focus();
  await expect(play).toHaveCSS('opacity','0');
  await album.hover();
  await expect(play).toHaveCSS('opacity','1');
  await play.click();
  await expect(page.getByRole('region',{name:'Album details'})).toHaveCount(0);
  await expect(page.locator('.player')).toContainText('Slow mornings');
  await expect(page.locator('.player').getByRole('button',{name:'Pause',exact:true})).toHaveAttribute('aria-pressed','true');
  const premium=page.getByRole('button',{name:'Explore Premium',exact:true});
  const resting=await premium.evaluate(el=>getComputedStyle(el).transform);
  await premium.hover();
  await expect.poll(()=>premium.evaluate(el=>getComputedStyle(el).transform)).not.toBe(resting);
  const duration=await premium.evaluate(el=>getComputedStyle(el).transitionDuration);
  expect(duration.split(',').some(value=>parseFloat(value)>0)).toBe(true);
  await page.getByRole('textbox',{name:'Search collection'}).fill('Slow');
  const suggestions=page.getByRole('region',{name:'Search suggestions'});
  await expect(suggestions).toHaveCSS('animation-name','music-reveal');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const target of [premium,play]) {
    await expect.poll(()=>target.evaluate(el=>getComputedStyle(el).transitionDuration.split(',').every(value=>parseFloat(value)===0))).toBe(true);
    await expect(target).toHaveCSS('animation-name','none');
  }
  await expect(suggestions).toHaveCSS('animation-name','none');
});
