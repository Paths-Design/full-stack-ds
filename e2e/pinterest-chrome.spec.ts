import { test, expect } from '@playwright/test';

const fixture='/e2e/fixtures/retoken-pages/index.html?page=pinterest';

for(const width of [1357,390]) {
  test(`Pinboard header surfaces and keyboard dismissal at ${width}px`,async({page},info)=>{
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width,height:1000});
    await page.goto(fixture);
    const nav=page.getByRole('button',{name:'Global navigation',exact:true});
    await nav.click();
    const tools=page.getByRole('region',{name:'Global navigation tools'});
    await expect(tools.getByRole('heading',{level:2})).toHaveText(['Shortcuts','Create content','Manage campaigns','Analyze performance','Manage business']);
    await expect(tools.getByText('New',{exact:true})).toHaveCSS('color','rgb(41, 70, 213)');
    await page.screenshot({path:info.outputPath(`navigation-${width}.png`)});
    await page.keyboard.press('Escape');
    await expect(tools).toHaveCount(0);
    await expect(nav).toBeFocused();
    await nav.click();
    if(width===1357) {
      await page.locator('.pin-scrim').click({position:{x:10,y:900}});
      await expect(tools).toHaveCount(0);
    } else {
      await nav.click();
      await expect(tools).toHaveCount(0);
    }
    await page.getByRole('button',{name:'Search ideas',exact:true}).click();
    const search=page.getByRole('textbox',{name:'Search collection'});
    await expect(search).toBeFocused();
    const suggestions=page.getByRole('region',{name:'Search suggestions'});
    await expect(suggestions.getByRole('heading')).toHaveText(['Recent searches','Ideas for you','Popular on Pinboard']);
    await expect(suggestions.locator('.pin-suggestion')).toHaveCount(16);
    await page.screenshot({path:info.outputPath(`search-${width}.png`)});
    await suggestions.getByRole('button',{name:'Fieldwork',exact:true}).click();
    await expect(suggestions).toHaveCount(0);
    await expect(page.locator('.pin')).toHaveCount(1);
    await expect(page.getByRole('button',{name:'Search ideas',exact:true})).toBeFocused();
    await page.getByRole('button',{name:'Home',exact:true}).click();
    await expect(page.locator('.pin')).toHaveCount(18);
    await page.getByRole('button',{name:'Notifications, 2 unread'}).click();
    const updates=page.getByRole('region',{name:'Notifications'});
    await expect(updates.getByRole('button')).toHaveCount(2);
    await updates.getByRole('button').first().click();
    await expect(page).toHaveURL(/pin=8/);
    await expect(page.getByRole('region',{name:'Pin details'}).getByRole('heading')).toHaveText('Ways of seeing: publication design');
    await page.getByRole('button',{name:'Back to feed',exact:true}).click();
    const account=page.getByRole('button',{name:'Account options',exact:true});
    await account.click();
    const menu=page.getByRole('region',{name:'Account options',exact:true});
    await expect(menu).toContainText('Currently in');
    await expect(menu).toContainText('Business');
    await page.screenshot({path:info.outputPath(`account-${width}.png`)});
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(account).toBeFocused();
    const engagement=page.getByRole('button',{name:'Engagement',exact:true});
    await engagement.click();
    const dialog=page.getByRole('dialog',{name:'Build your audience'});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button',{name:'Got it'})).toBeFocused();
    // Native modal dialogs may tab into browser chrome. Background page
    // controls must remain inert even when a caller tries to focus them.
    await nav.focus();
    await expect(dialog.getByRole('button',{name:'Got it'})).toBeFocused();
    await page.screenshot({path:info.outputPath(`audience-${width}.png`)});
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(engagement).toBeFocused();
    await engagement.click();
    await dialog.getByRole('button',{name:'Got it'}).click();
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
}

test('Shortest-column feed packs every column and recomputes after resize and filtering',async({page},info)=>{
  await page.goto(fixture);
  for(const width of [1357,900,390,1357]) {
    await page.setViewportSize({width,height:1000});
    await expect(page.locator('.pin-placement')).toHaveCount(18);
    await expect.poll(async()=>page.locator('.pin-masonry').evaluate(feed=>{
      const cards=Array.from(feed.children).map(card=>card.getBoundingClientRect());
      const columns=new Map<number,DOMRect[]>();
      for(const card of cards) {
        const x=Math.round(card.x);columns.set(x,[...(columns.get(x)??[]),card]);
      }
      return [...columns.values()].every(cards=>cards.sort((a,b)=>a.y-b.y).every((card,i)=>i===0||Math.abs(card.top-cards[i-1].bottom-16)<1));
    })).toBe(true);
    const geometry=await page.locator('.pin-masonry').evaluate(feed=>{
      const bounds=feed.getBoundingClientRect();
      const cards=Array.from(feed.children).map(card=>card.getBoundingClientRect());
      return {columns:new Set(cards.map(card=>Math.round(card.x))).size,bottom:Math.max(...cards.map(card=>card.bottom)),feedBottom:bounds.bottom,counts:cards.reduce<Record<number,number>>((result,card)=>{const x=Math.round(card.x);result[x]=(result[x]??0)+1;return result;},{}),overflow:document.documentElement.scrollWidth};
    });
    expect(geometry.columns).toBe(width===1357?5:width===900?3:2);
    expect(Math.abs(geometry.bottom-geometry.feedBottom)).toBeLessThan(1);
    expect(Math.min(...Object.values(geometry.counts))).toBeGreaterThanOrEqual(3);
    expect(geometry.overflow).toBeLessThanOrEqual(width);
  }
  await page.screenshot({path:info.outputPath('feed-1357.png'),fullPage:true});
  await page.getByRole('button',{name:'Typography',exact:true}).click();
  await expect(page.locator('.pin')).toHaveCount(1);
  await expect(page.locator('.pin')).toContainText('Type Assembly');
  await page.getByRole('button',{name:'Search ideas',exact:true}).click();
  await page.getByRole('textbox',{name:'Search collection'}).fill('no matches');
  await page.getByRole('textbox',{name:'Search collection'}).press('Enter');
  await expect(page.getByRole('status')).toHaveText('No ideas found');
  await expect(page.locator('.pin-masonry')).toHaveCSS('height','0px');
  await page.getByRole('button',{name:'Home',exact:true}).click();
  await expect(page.locator('.pin')).toHaveCount(18);
});
