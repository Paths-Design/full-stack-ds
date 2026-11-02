import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "https://example.test/مصدر/日本語?quote=Prêt&edition=2#نص";
const CHANGED = "../sources/別の引用?edition=3&lang=ar#مقطع";
const TEXT = "قالت ليلى: «Prêt 日本語 — a quoted thought.»";

export const citationData = `
const citationSource = ${JSON.stringify(SOURCE)};
const citationChanged = ${JSON.stringify(CHANGED)};
const citationText = ${JSON.stringify(TEXT)};
`;

export const citationReact = `
function CitationConsumer() {
  const [cite, setCite] = React.useState<string | undefined>();
  return React.createElement("section", { id: "citation-consumer", lang: "ar", dir: "rtl", style: { width: "240px" } },
    React.createElement("button", { id: "citation-source", onClick: () => setCite(citationSource) }, "Source"),
    React.createElement("button", { id: "citation-changed", onClick: () => setCite(citationChanged) }, "Changed"),
    React.createElement("button", { id: "citation-empty", onClick: () => setCite("") }, "Empty"),
    React.createElement("button", { id: "citation-clear", onClick: () => setCite(undefined) }, "Clear"),
    React.createElement("button", { id: "before-citation" }, "Before quote"),
    React.createElement(Blockquote, { cite }, React.createElement("span", { id: "citation-body" }, citationText)),
    React.createElement("button", { id: "after-citation" }, "After quote"));
}
`;

export const citationVue = `
const CitationConsumer = { setup() {
  const cite = ref<string | undefined>();
  return () => h("section", { id: "citation-consumer", lang: "ar", dir: "rtl", style: "width:240px" }, [
    h("button", { id: "citation-source", onClick: () => { cite.value = citationSource; } }, "Source"),
    h("button", { id: "citation-changed", onClick: () => { cite.value = citationChanged; } }, "Changed"),
    h("button", { id: "citation-empty", onClick: () => { cite.value = ""; } }, "Empty"),
    h("button", { id: "citation-clear", onClick: () => { cite.value = undefined; } }, "Clear"),
    h("button", { id: "before-citation" }, "Before quote"),
    h(Blockquote, { cite: cite.value }, { default: () => h("span", { id: "citation-body" }, citationText) }),
    h("button", { id: "after-citation" }, "After quote"),
  ]);
} };
`;

export const citationSvelteState = `let citationCite = $state<string | undefined>();`;
export const citationSvelteTemplate = `
<section id="citation-consumer" lang="ar" dir="rtl" style="width:240px">
  <button id="citation-source" onclick={() => { citationCite = citationSource; }}>Source</button>
  <button id="citation-changed" onclick={() => { citationCite = citationChanged; }}>Changed</button>
  <button id="citation-empty" onclick={() => { citationCite = ""; }}>Empty</button>
  <button id="citation-clear" onclick={() => { citationCite = undefined; }}>Clear</button>
  <button id="before-citation">Before quote</button>
  <Blockquote cite={citationCite}><span id="citation-body">{citationText}</span></Blockquote>
  <button id="after-citation">After quote</button>
</section>
`;

export const citationAngularTemplate = `
<section id="citation-consumer" lang="ar" dir="rtl" style="width:240px">
  <button id="citation-source" (click)="citationCite.set(citationSource)">Source</button>
  <button id="citation-changed" (click)="citationCite.set(citationChanged)">Changed</button>
  <button id="citation-empty" (click)="citationCite.set('')">Empty</button>
  <button id="citation-clear" (click)="citationCite.set(undefined)">Clear</button>
  <button id="before-citation">Before quote</button>
  <fsds-blockquote [cite]="citationCite()"><span id="citation-body">{{ citationText }}</span></fsds-blockquote>
  <button id="after-citation">After quote</button>
</section>
`;
export const citationAngularFields = `
readonly citationSource = citationSource;
readonly citationChanged = citationChanged;
readonly citationText = citationText;
readonly citationCite = signal<string | undefined>(undefined);
`;

export const citationLit = `
const citationConsumer = document.createElement("section");
Object.assign(citationConsumer, { id: "citation-consumer", lang: "ar", dir: "rtl" });
citationConsumer.style.width = "240px";
const citationQuote = new BlockquoteElement();
const citationBody = document.createElement("span");
citationBody.id = "citation-body";
citationBody.textContent = citationText;
citationQuote.append(citationBody);
const citationControls = ([
  ["citation-source", "Source", () => { citationQuote.cite = citationSource; }],
  ["citation-changed", "Changed", () => { citationQuote.cite = citationChanged; }],
  ["citation-empty", "Empty", () => { citationQuote.cite = ""; }],
  ["citation-clear", "Clear", () => { citationQuote.cite = undefined; }],
  ["before-citation", "Before quote", () => {}],
  ["after-citation", "After quote", () => {}],
] as const).map(([id, text, activate]) => {
  const control = document.createElement("button");
  control.id = id;
  control.textContent = text;
  control.onclick = activate;
  return control;
});
citationConsumer.append(...citationControls.slice(0, 5), citationQuote, citationControls[5]);
document.getElementById("app")!.append(citationConsumer);
`;

export async function verifyBlockquote({ page, framework, evidence, expect, observation }) {
  const viewport = page.locator("#citation-consumer");
  // CSS locators enter Lit's shadow root; the projected body remains light DOM.
  const quote = viewport.locator("blockquote");
  const body = viewport.locator("#citation-body");
  const stages = [];
  observation.blockquote = { stages, limits: "HTML source URL metadata; Chromium DOM, keyboard, layout and AX observations only. No visible attribution, automatic link or OS screen-reader qualification." };
  await page.setViewportSize({ width: 304, height: 960 });
  await expect(quote).toHaveCount(1);
  const original = await quote.elementHandle();
  assert.ok(original);
  const cdp = await page.context().newCDPSession(page);
  try {
    for (const [stage, control, expected] of [
      ["undefined", null, null], ["source", "citation-source", SOURCE],
      ["changed", "citation-changed", CHANGED], ["empty", "citation-empty", ""],
      ["cleared", "citation-clear", null],
    ]) {
      if (control) await page.locator("#" + control).click();
      await expect.poll(() => quote.getAttribute("cite")).toBe(expected);
      await expect(body).toBeVisible();
      await expect(body).toHaveText(TEXT);
      await quote.scrollIntoViewIfNeeded();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const facts = {
        stage, sameElement: await quote.evaluate((element, previous) => element === previous, original),
        quote: await quote.evaluate(element => {
          let ancestor = element;
          let language;
          while (ancestor) {
            if (ancestor.hasAttribute("lang")) { language = ancestor.getAttribute("lang"); break; }
            const root = ancestor.getRootNode();
            ancestor = ancestor.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
          }
          const slot = element.querySelector("slot");
          const text = slot ? slot.assignedNodes({ flatten: true }).map(node => node.textContent).join("") : element.textContent;
          return { tag: element.tagName, cite: element.getAttribute("cite"), text: text.trim(), tabIndex: element.tabIndex,
            tabindexAttribute: element.getAttribute("tabindex"), direction: getComputedStyle(element).direction,
            language, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, outerHTML: element.outerHTML };
        }),
        viewport: await viewport.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right, width: bounds.width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, text: element.innerText };
        }),
        body: await body.evaluate(element => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return { text: element.textContent, rects: [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right, width: rect.width, height: rect.height })) };
        }),
      };
      await page.locator("#before-citation").focus();
      await page.keyboard.press("Tab");
      await expect(page.locator("#after-citation")).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(page.locator("#before-citation")).toBeFocused();
      facts.tabPassThrough = true;
      const ax = await cdp.send("Accessibility.getFullAXTree");
      stages.push(facts);
      writeFileSync(join(evidence, `browser-blockquote-${framework}-${stage}.json`), JSON.stringify(facts, null, 2));
      writeFileSync(join(evidence, `browser-blockquote-${framework}-${stage}-AX.json`), JSON.stringify(ax, null, 2));
      await viewport.screenshot({ path: join(evidence, `packed-blockquote-${framework}-${stage}.png`) });
      assert.equal(facts.sameElement, true, framework + ": cite changes must retain the actual blockquote");
      assert.equal(facts.quote.tag, "BLOCKQUOTE");
      assert.equal(facts.quote.cite, expected);
      assert.equal(facts.quote.text, TEXT, framework + ": metadata must not add visible attribution");
      assert.equal(facts.quote.direction, "rtl");
      assert.equal(facts.quote.language, "ar");
      assert.equal(facts.quote.tabIndex, -1);
      assert.equal(facts.quote.tabindexAttribute, null);
      await expect(quote.locator("[tabindex]")).toHaveCount(0);
      await expect(viewport.getByRole("link")).toHaveCount(0);
      await expect(viewport.locator("cite")).toHaveCount(0);
      await expect(viewport.getByRole("button")).toHaveCount(6);
      assert.ok(!facts.viewport.text.includes(SOURCE) && !facts.viewport.text.includes(CHANGED));
      assert.ok(Math.abs(facts.viewport.width - 240) <= 1);
      assert.ok(facts.viewport.scrollWidth <= facts.viewport.clientWidth + 1, framework + ": quote must fit the 240px consumer");
      assert.ok(facts.quote.scrollWidth <= facts.quote.clientWidth + 1, framework + ": quote content must not overflow");
      assert.ok(facts.body.rects.length > 0);
      for (const rect of facts.body.rects) {
        assert.ok(rect.width > 0 && rect.height > 0);
        assert.ok(rect.left >= facts.viewport.left - 1 && rect.right <= facts.viewport.right + 1, framework + ": quoted text must remain inside the narrow consumer");
      }
      assert.ok(ax.nodes.some(node => !node.ignored && node.role?.value === "StaticText" && node.name?.value === TEXT), framework + ": quoted text must reach the Chromium accessibility tree");
    }
  } finally {
    await original.dispose();
    await cdp.detach();
    await page.setViewportSize({ width: 1280, height: 720 });
  }
}
