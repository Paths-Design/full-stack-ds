import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const HOSTILE = String.fromCodePoint(0x754c, 0x22, 0x5c, 0x0a);
const ARABIC = "مسار التنقل";
const JAPANESE = "パンくず経路";
const LABELS = { a: "الرئيسية", b: "製品", c: "現在" };
const CONTROLS = [
  ["pipe", "Pipe"], ["empty", "Empty"], ["hostile", "Literal"], ["default", "Default"],
  ["reorder", "Reorder"], ["translated", "日本語"], ["one", "One"], ["none", "None"], ["three", "Three"],
];

export const crumbsData = `
type CrumbId = "a" | "b" | "c";
type CrumbsState = { items: CrumbId[]; separator: string | undefined; label: string; language: string };
const crumbLabels: Record<CrumbId, string> = ${JSON.stringify(LABELS)};
const crumbControls = ${JSON.stringify(CONTROLS)} as const;
const crumbInitial: CrumbsState = { items: ["a", "b", "c"], separator: undefined, label: ${JSON.stringify(ARABIC)}, language: "ar" };
function crumbChange(state: CrumbsState, action: string): CrumbsState {
  switch (action) {
    case "pipe": return { ...state, separator: "|" };
    case "empty": return { ...state, separator: "" };
    case "hostile": return { ...state, separator: ${JSON.stringify(HOSTILE)} };
    case "default": return { ...state, separator: undefined };
    case "reorder": return { ...state, items: ["c", "a", "b"] };
    case "translated": return { ...state, label: ${JSON.stringify(JAPANESE)}, language: "ja" };
    case "one": return { ...state, items: ["a"] };
    case "none": return { ...state, items: [] };
    case "three": return { ...state, items: ["a", "b", "c"] };
    default: throw new Error("Unknown breadcrumb action " + action);
  }
}
`;

export const crumbsReact = `
function CrumbNested() {
  return React.createElement("div", { lang: "en", dir: "ltr" },
    React.createElement(Breadcrumbs, { ariaLabel: "Nested route", separator: "·" },
      React.createElement("li", null, React.createElement("a", { href: "#crumb-inner-start" }, "Inner start")),
      React.createElement("li", null, React.createElement("a", { href: "#crumb-inner-end", "aria-current": "page" }, "Inner end"))));
}
function CrumbsConsumer() {
  const [state, setState] = React.useState(crumbInitial);
  const children = state.items.map(id => {
    const content = [
      React.createElement("a", { key: "link", id: "crumb-" + id, href: "#crumb-" + id, title: "Authored " + id, lang: "ar", "aria-current": id === "c" ? "page" : undefined }, crumbLabels[id]),
      id === "a" ? React.createElement("input", { key: "note", id: "crumb-note", "aria-label": "Consumer note", defaultValue: "seed", style: { width: "48px" } }) : null,
      id === "c" ? React.createElement(CrumbNested, { key: "nested" }) : null,
    ];
    return id === "b"
      ? React.createElement(BreadcrumbsItem, { key: id, className: "crumb-item crumb-" + id }, content)
      : React.createElement("li", { key: id, className: "crumb-item crumb-" + id }, content);
  });
  return React.createElement("section", { id: "crumbs-consumer", lang: state.language, dir: "rtl", style: { width: "240px" } },
    ...crumbControls.map(([action, label]) => React.createElement("button", { key: action, id: "crumbs-" + action, onClick: () => setState(value => crumbChange(value, action)) }, label)),
    React.createElement("button", { id: "before-crumbs" }, "Before trail"),
    React.createElement("div", { id: "crumbs-main" }, React.createElement(Breadcrumbs, { ariaLabel: state.label, separator: state.separator }, children)),
    React.createElement("button", { id: "after-crumbs" }, "After trail"));
}
`;

export const crumbsVue = `
const crumbNested = () => h("div", { lang: "en", dir: "ltr" }, [
  h(Breadcrumbs, { ariaLabel: "Nested route", separator: "·" }, { default: () => [
    h("li", null, [h("a", { href: "#crumb-inner-start" }, "Inner start")]),
    h("li", null, [h("a", { href: "#crumb-inner-end", "aria-current": "page" }, "Inner end")]),
  ] }),
]);
const CrumbsConsumer = { setup() {
  const state = ref<CrumbsState>(crumbInitial);
  const children = () => state.value.items.map(id => {
    const content = () => [
      h("a", { id: "crumb-" + id, href: "#crumb-" + id, title: "Authored " + id, lang: "ar", "aria-current": id === "c" ? "page" : undefined }, crumbLabels[id]),
      id === "a" ? h("input", { id: "crumb-note", "aria-label": "Consumer note", defaultValue: "seed", style: "width:48px" }) : null,
      id === "c" ? crumbNested() : null,
    ];
    return id === "b"
      ? h(BreadcrumbsItem, { key: id, class: "crumb-item crumb-" + id }, { default: content })
      : h("li", { key: id, class: "crumb-item crumb-" + id }, content());
  });
  return () => h("section", { id: "crumbs-consumer", lang: state.value.language, dir: "rtl", style: "width:240px" }, [
    ...crumbControls.map(([action, label]) => h("button", { key: action, id: "crumbs-" + action, onClick: () => { state.value = crumbChange(state.value, action); } }, label)),
    h("button", { id: "before-crumbs" }, "Before trail"),
    h("div", { id: "crumbs-main" }, [h(Breadcrumbs, { ariaLabel: state.value.label, separator: state.value.separator }, { default: children })]),
    h("button", { id: "after-crumbs" }, "After trail"),
  ]);
} };
`;

export const crumbsSvelteState = `let crumbsState = $state<CrumbsState>(crumbInitial);`;
export const crumbsSvelteTemplate = `
{#snippet crumbNested()}
  <div lang="en" dir="ltr"><Breadcrumbs ariaLabel="Nested route" separator="·">
    <li><a href="#crumb-inner-start">Inner start</a></li>
    <li><a href="#crumb-inner-end" aria-current="page">Inner end</a></li>
  </Breadcrumbs></div>
{/snippet}
<section id="crumbs-consumer" lang={crumbsState.language} dir="rtl" style="width:240px">
  {#each crumbControls as [action, label] (action)}
    <button id={"crumbs-" + action} onclick={() => { crumbsState = crumbChange(crumbsState, action); }}>{label}</button>
  {/each}
  <button id="before-crumbs">Before trail</button>
  <div id="crumbs-main"><Breadcrumbs ariaLabel={crumbsState.label} separator={crumbsState.separator}>
    {#each crumbsState.items as item (item)}
      {#if item === "b"}
        <BreadcrumbsItem class="crumb-item crumb-b"><a id="crumb-b" href="#crumb-b" title="Authored b" lang="ar">{crumbLabels.b}</a></BreadcrumbsItem>
      {:else}
        <li class={"crumb-item crumb-" + item}>
          <a id={"crumb-" + item} href={"#crumb-" + item} title={"Authored " + item} lang="ar" aria-current={item === "c" ? "page" : undefined}>{crumbLabels[item]}</a>
          {#if item === "a"}<input id="crumb-note" aria-label="Consumer note" value="seed" style="width:48px" />{/if}
          {#if item === "c"}{@render crumbNested()}{/if}
        </li>
      {/if}
    {/each}
  </Breadcrumbs></div>
  <button id="after-crumbs">After trail</button>
</section>
`;

export const crumbsAngularFields = `
readonly crumbControls = crumbControls;
readonly crumbLabels = crumbLabels;
readonly crumbsState = signal<CrumbsState>(crumbInitial);
readonly changeCrumbs = (action: string) => this.crumbsState.update(value => crumbChange(value, action));
`;
export const crumbsAngularTemplate = `
<section id="crumbs-consumer" [lang]="crumbsState().language" dir="rtl" style="width:240px">
  @for (control of crumbControls; track control[0]) {
    <button [id]="'crumbs-' + control[0]" (click)="changeCrumbs(control[0])">{{ control[1] }}</button>
  }
  <button id="before-crumbs">Before trail</button>
  <div id="crumbs-main"><fsds-breadcrumbs [ariaLabel]="crumbsState().label" [separator]="crumbsState().separator">
    @for (item of crumbsState().items; track item) {
      @if (item === 'b') {
        <li fsdsBreadcrumbsItem class="crumb-item crumb-b"><a id="crumb-b" href="#crumb-b" title="Authored b" lang="ar">{{ crumbLabels.b }}</a></li>
      } @else {
        <li [class]="'crumb-item crumb-' + item">
          <a [id]="'crumb-' + item" [href]="'#crumb-' + item" [title]="'Authored ' + item" lang="ar" [attr.aria-current]="item === 'c' ? 'page' : null">{{ crumbLabels[item] }}</a>
          @if (item === 'a') { <input id="crumb-note" aria-label="Consumer note" value="seed" style="width:48px" /> }
          @if (item === 'c') {
            <div lang="en" dir="ltr"><fsds-breadcrumbs ariaLabel="Nested route" separator="·">
              <li><a href="#crumb-inner-start">Inner start</a></li>
              <li><a href="#crumb-inner-end" aria-current="page">Inner end</a></li>
            </fsds-breadcrumbs></div>
          }
        </li>
      }
    }
  </fsds-breadcrumbs></div>
  <div id="crumbs-legacy">
    <fsds-breadcrumbs ariaLabel="Legacy route" separator="›">
      <fsds-breadcrumbs-item><a id="crumb-legacy-start" href="#crumb-legacy-start">Legacy start</a></fsds-breadcrumbs-item>
      <fsds-breadcrumbs-item><a id="crumb-legacy-end" href="#crumb-legacy-end" aria-current="page">Legacy end</a></fsds-breadcrumbs-item>
    </fsds-breadcrumbs>
  </div>
  <button id="after-crumbs">After trail</button>
</section>
`;

export const crumbsLit = `
let crumbsState = crumbInitial;
const crumbsConsumer = document.createElement("section");
Object.assign(crumbsConsumer, { id: "crumbs-consumer", dir: "rtl" });
crumbsConsumer.style.width = "240px";
const crumbsMain = document.createElement("div");
crumbsMain.id = "crumbs-main";
const crumbsTrail = new BreadcrumbsElement();
crumbsMain.append(crumbsTrail);
const crumbNodes = new Map<CrumbId, HTMLElement>();
for (const id of ["a", "b", "c"] as const) {
  const item = id === "b" ? new BreadcrumbsItemElement() : document.createElement("li");
  item.className = "crumb-item crumb-" + id;
  const link = document.createElement("a");
  Object.assign(link, { id: "crumb-" + id, href: "#crumb-" + id, title: "Authored " + id, lang: "ar", textContent: crumbLabels[id] });
  if (id === "c") link.setAttribute("aria-current", "page");
  item.append(link);
  if (id === "a") {
    const note = document.createElement("input");
    Object.assign(note, { id: "crumb-note", defaultValue: "seed" });
    note.setAttribute("aria-label", "Consumer note");
    note.style.width = "48px";
    item.append(note);
  }
  if (id === "c") {
    const wrapper = document.createElement("div");
    Object.assign(wrapper, { lang: "en", dir: "ltr" });
    const nested = new BreadcrumbsElement();
    Object.assign(nested, { ariaLabel: "Nested route", separator: "·" });
    for (const [name, href] of [["Inner start", "#crumb-inner-start"], ["Inner end", "#crumb-inner-end"]]) {
      const li = document.createElement("li");
      const anchor = document.createElement("a");
      Object.assign(anchor, { href, textContent: name });
      if (name === "Inner end") anchor.setAttribute("aria-current", "page");
      li.append(anchor); nested.append(li);
    }
    wrapper.append(nested); item.append(wrapper);
  }
  crumbNodes.set(id, item);
}
const renderCrumbs = () => {
  crumbsConsumer.lang = crumbsState.language;
  crumbsTrail.ariaLabel = crumbsState.label;
  crumbsTrail.separator = crumbsState.separator;
  const wanted = crumbsState.items.map(id => crumbNodes.get(id)!);
  if (wanted.length !== crumbsTrail.children.length || wanted.some((node, index) => node !== crumbsTrail.children[index])) crumbsTrail.replaceChildren(...wanted);
};
const crumbButtons = crumbControls.map(([action, label]) => {
  const button = document.createElement("button");
  Object.assign(button, { id: "crumbs-" + action, textContent: label });
  button.onclick = () => { crumbsState = crumbChange(crumbsState, action); renderCrumbs(); };
  return button;
});
const beforeCrumbs = document.createElement("button");
Object.assign(beforeCrumbs, { id: "before-crumbs", textContent: "Before trail" });
const afterCrumbs = document.createElement("button");
Object.assign(afterCrumbs, { id: "after-crumbs", textContent: "After trail" });
crumbsConsumer.append(...crumbButtons, beforeCrumbs, crumbsMain, afterCrumbs);
renderCrumbs();
document.getElementById("app")!.append(crumbsConsumer);
`;

function decorativeText(content) {
  const match = content.match(/^("(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*')\s*\/\s*(?:""|'')$/);
  assert.ok(match, "Separator content requires a CSS string and explicit empty alternative: " + content);
  return match[1].slice(1, -1).replace(/\\([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|\\([\s\S])/gi,
    (_whole, hex, character) => hex ? String.fromCodePoint(parseInt(hex, 16)) : character);
}

function axWithin(nodes, root) {
  const index = new Map(nodes.map(node => [node.nodeId, node]));
  const result = [];
  const visit = node => {
    if (node !== root && !node.ignored && node.role?.value === "navigation") return;
    result.push(node);
    // The consumer's editable note owns its internal text; it is not a breadcrumb decoration.
    if (node.role?.value === "textbox") return;
    for (const id of node.childIds ?? []) { const child = index.get(id); if (child) visit(child); }
  };
  visit(root);
  return result.filter(node => !node.ignored);
}

export async function verifyBreadcrumbs({ page, framework, evidence, expect, observation }) {
  const consumer = page.locator("#crumbs-consumer");
  const main = consumer.locator("#crumbs-main");
  const stages = [];
  const retained = new Map();
  observation.breadcrumbs = {
    stages,
    limits: "Installed Chromium consumer; authored current token is checked on the DOM node represented by its AX link. No OS screen-reader or other-browser qualification.",
  };
  await page.setViewportSize({ width: 304, height: 1100 });
  const cdp = await page.context().newCDPSession(page);
  let note = null;
  try {
    const capture = async (stage, ids, separator, label = ARABIC, language = "ar") => {
      const nav = main.getByRole("navigation", { name: label, exact: true });
      await consumer.scrollIntoViewIfNeeded();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const facts = {
        stage, expected: { ids, separator, label, language },
        consumer: await consumer.evaluate(element => ({ language: element.lang, width: element.getBoundingClientRect().width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })),
        roots: await main.locator(".crumb-item").evaluateAll(elements => elements.map(element => {
          const candidates = [element];
          for (let index = 0; index < candidates.length; index++) {
            if (candidates[index].shadowRoot) candidates.push(...candidates[index].shadowRoot.querySelectorAll("*"));
          }
          return { className: element.className, tag: element.tagName,
            pseudo: candidates.map(node => ({ tag: node.tagName, content: getComputedStyle(node, "::before").content }))
              .filter(item => !["none", "normal"].includes(item.content)) };
        })),
      };
      const ax = await cdp.send("Accessibility.getFullAXTree");
      const axRoot = ax.nodes.find(node => !node.ignored && node.role?.value === "navigation" && node.name?.value === label);
      facts.ax = axRoot ? axWithin(ax.nodes, axRoot) : [];
      if (framework === "angular") {
        const legacyAXRoot = ax.nodes.find(node =>
          !node.ignored && node.role?.value === "navigation" && node.name?.value === "Legacy route");
        facts.legacy = {
          hostCount: await consumer.locator("#crumbs-legacy fsds-breadcrumbs-item").count(),
          ax: legacyAXRoot ? axWithin(ax.nodes, legacyAXRoot) : [],
          links: await consumer.locator("#crumbs-legacy a").evaluateAll(elements =>
            elements.map(element => ({
              text: element.textContent, href: element.getAttribute("href"),
              current: element.getAttribute("aria-current"),
            }))),
        };
      }
      const current = facts.ax.find(node => node.role?.value === "link" && node.name?.value === LABELS.c);
      if (current?.backendDOMNodeId) {
        facts.currentDOM = (await cdp.send("DOM.describeNode", { backendNodeId: current.backendDOMNodeId })).node;
      }
      stages.push(facts);
      const save = () => writeFileSync(join(evidence, `browser-breadcrumbs-${framework}-${stage}.json`), JSON.stringify(facts, null, 2));
      save();
      writeFileSync(join(evidence, `browser-breadcrumbs-${framework}-${stage}-AX.json`), JSON.stringify(ax, null, 2));
      await consumer.screenshot({ path: join(evidence, `packed-breadcrumbs-${framework}-${stage}.png`) });
      await expect(nav).toHaveCount(1);
      const structure = await nav.evaluate(element => {
        const list = element.querySelector(":scope > ol");
        const children = list ? [...list.children].flatMap(child => child instanceof HTMLSlotElement ? child.assignedElements({ flatten: true }) : [child]) : [];
        return { tag: element.tagName, direction: getComputedStyle(element).direction, list: list?.tagName,
          ids: children.map(child => [...child.classList].find(name => /^crumb-[abc]$/.test(name))?.slice(-1)) };
      });
      assert.deepEqual(structure, { tag: "NAV", direction: "rtl", list: "OL", ids });
      assert.equal(facts.consumer.language, language);
      assert.ok(Math.abs(facts.consumer.width - 240) <= 1);
      assert.ok(facts.consumer.scrollWidth <= facts.consumer.clientWidth + 1, framework + ": narrow breadcrumb consumer must not overflow");
      assert.equal(facts.roots.length, ids.length);
      for (let index = 0; index < ids.length; index++) {
        const id = ids[index];
        const item = main.locator(".crumb-item.crumb-" + id);
        const anchor = main.locator("#crumb-" + id);
        await expect(anchor).toHaveAttribute("href", "#crumb-" + id);
        await expect(anchor).toHaveAttribute("title", "Authored " + id);
        await expect(anchor).toHaveAttribute("lang", "ar");
        assert.equal(await anchor.getAttribute("aria-current"), id === "c" ? "page" : null);
        const old = retained.get(id);
        if (old) {
          assert.equal(await item.evaluate((element, previous) => element === previous, old.item), true, framework + ": retained keyed item identity");
          assert.equal(await anchor.evaluate((element, previous) => element === previous, old.anchor), true, framework + ": retained authored anchor identity");
        } else retained.set(id, { item: await item.elementHandle(), anchor: await anchor.elementHandle() });
        const pseudo = facts.roots[index].pseudo;
        if (index === 0) assert.deepEqual(pseudo, [], framework + ": first direct item has no separator");
        else {
          assert.equal(pseudo.length, 1, framework + ": one decorative separator per subsequent direct item");
          assert.equal(decorativeText(pseudo[0].content), separator);
        }
      }
      for (const [id, handles] of retained) if (!ids.includes(id)) {
        await handles.item.dispose(); await handles.anchor.dispose(); retained.delete(id);
      }
      if (ids.includes("a")) {
        const input = main.locator("#crumb-note");
        if (note) {
          assert.equal(await input.evaluate((element, previous) => element === previous, note), true);
          await expect(input).toHaveValue("retained");
        } else { await input.fill("retained"); note = await input.elementHandle(); }
      } else if (note) { await note.dispose(); note = null; }
      const roles = role => facts.ax.filter(node => node.role?.value === role);
      assert.equal(roles("list").length, 1);
      assert.equal(roles("listitem").length, ids.length);
      assert.equal(roles("textbox").length, ids.includes("a") ? 1 : 0);
      assert.deepEqual(roles("link").map(node => node.name?.value), ids.map(id => LABELS[id]));
      assert.deepEqual(roles("StaticText").map(node => node.name?.value).sort(), ids.map(id => LABELS[id]).sort(), framework + ": separators must not become AX text");
      if (framework === "angular") {
        const legacy = consumer.locator("#crumbs-legacy");
        await expect(legacy.getByRole("navigation", { name: "Legacy route", exact: true })).toHaveCount(1);
        await expect(legacy.getByRole("listitem")).toHaveCount(2);
        assert.equal(facts.legacy.hostCount, 2, "Angular: retain the existing element selector");
        assert.equal(facts.legacy.ax.filter(node => node.role?.value === "list").length, 1);
        assert.equal(facts.legacy.ax.filter(node => node.role?.value === "listitem").length, 2);
        assert.deepEqual(
          facts.legacy.ax.filter(node => node.role?.value === "link").map(node => node.name?.value),
          ["Legacy start", "Legacy end"]);
        assert.deepEqual(
          facts.legacy.ax.filter(node => node.role?.value === "StaticText").map(node => node.name?.value),
          ["Legacy start", "Legacy end"],
          "Angular: legacy separators must remain decorative");
        assert.deepEqual(facts.legacy.links, [
          { text: "Legacy start", href: "#crumb-legacy-start", current: null },
          { text: "Legacy end", href: "#crumb-legacy-end", current: "page" },
        ]);
      }
      if (ids.includes("c")) {
        const attributes = facts.currentDOM?.attributes ?? [];
        const currentAttributes = Object.fromEntries(Array.from({ length: attributes.length / 2 }, (_, index) => [attributes[index * 2], attributes[index * 2 + 1]]));
        assert.equal(currentAttributes["aria-current"], "page");
        assert.equal(currentAttributes.href, "#crumb-c");
        const nested = main.getByRole("navigation", { name: "Nested route", exact: true });
        const nestedItems = await nested.evaluate(element => {
          const list = element.querySelector(":scope > ol");
          return list ? [...list.children].flatMap(child => child instanceof HTMLSlotElement ? child.assignedElements({ flatten: true }) : [child]).map(item => ({ tag: item.tagName, content: getComputedStyle(item, "::before").content })) : [];
        });
        assert.deepEqual(nestedItems.map(item => item.tag), ["LI", "LI"]);
        const contents = nestedItems.map(item => item.content);
        assert.ok(["none", "normal"].includes(contents[0]));
        assert.equal(decorativeText(contents[1]), "·", framework + ": nested separator must be isolated from parent updates");
        const nestedAXRoot = ax.nodes.find(node => !node.ignored && node.role?.value === "navigation" && node.name?.value === "Nested route");
        assert.ok(nestedAXRoot);
        const nestedAX = axWithin(ax.nodes, nestedAXRoot);
        assert.equal(nestedAX.filter(node => node.role?.value === "listitem").length, 2);
        assert.deepEqual(nestedAX.filter(node => node.role?.value === "link").map(node => node.name?.value), ["Inner start", "Inner end"]);
        assert.deepEqual(nestedAX.filter(node => node.role?.value === "StaticText").map(node => node.name?.value), ["Inner start", "Inner end"]);
      }
      if (stage === "initial") {
        facts.hiddenItems = [];
        const first = main.locator(".crumb-item.crumb-a");
        const second = main.locator(".crumb-item.crumb-b");
        try {
          for (const hidden of [["a"], ["a", "b"]]) {
            await first.evaluate(element => { element.hidden = true; });
            if (hidden.includes("b")) await second.evaluate(element => { element.hidden = true; });
            const firstVisible = main.locator(".crumb-item.crumb-" + (hidden.length === 1 ? "b" : "c"));
            const pseudo = await firstVisible.evaluate(element => {
              const nodes = [element];
              for (let index = 0; index < nodes.length; index++) if (nodes[index].shadowRoot) nodes.push(...nodes[index].shadowRoot.querySelectorAll("*"));
              return nodes.map(node => getComputedStyle(node, "::before").content).filter(content => !["none", "normal"].includes(content));
            });
            const hiddenAX = await cdp.send("Accessibility.getFullAXTree");
            const hiddenRoot = hiddenAX.nodes.find(node => !node.ignored && node.role?.value === "navigation" && node.name?.value === label);
            const visibleAX = hiddenRoot ? axWithin(hiddenAX.nodes, hiddenRoot) : [];
            facts.hiddenItems.push({ hidden, firstVisiblePseudo: pseudo, ax: visibleAX });
            save();
            writeFileSync(join(evidence, `browser-breadcrumbs-${framework}-hidden-${hidden.length}-AX.json`), JSON.stringify(hiddenAX, null, 2));
            await consumer.screenshot({ path: join(evidence, `packed-breadcrumbs-${framework}-hidden-${hidden.length}.png`) });
            assert.deepEqual(pseudo, [], framework + ": the first visible item must not acquire a leading separator");
            assert.deepEqual(visibleAX.filter(node => node.role?.value === "link").map(node => node.name?.value), ids.filter(id => !hidden.includes(id)).map(id => LABELS[id]));
            assert.equal(visibleAX.filter(node => node.role?.value === "listitem").length, ids.length - hidden.length);
          }
        } finally {
          await first.evaluate(element => { element.hidden = false; });
          await second.evaluate(element => { element.hidden = false; });
        }
        await page.locator("#before-crumbs").focus();
        await page.keyboard.press("Tab");
        await expect(main.locator("#crumb-a")).toBeFocused();
        await page.keyboard.press("Enter");
        await expect.poll(() => page.evaluate(() => location.hash)).toBe("#crumb-a");
        await page.evaluate(() => history.replaceState(null, "", location.pathname + location.search));
        facts.nativeTabAndEnter = true;
        save();
      }
    };
    await capture("initial", ["a", "b", "c"], "/");
    for (const [stage, ids, separator, label, language] of [
      ["pipe", ["a", "b", "c"], "|", ARABIC, "ar"],
      ["empty", ["a", "b", "c"], "", ARABIC, "ar"],
      ["hostile", ["a", "b", "c"], HOSTILE, ARABIC, "ar"],
      ["default", ["a", "b", "c"], "/", ARABIC, "ar"],
      ["reorder", ["c", "a", "b"], "/", ARABIC, "ar"],
      ["translated", ["c", "a", "b"], "/", JAPANESE, "ja"],
      ["one", ["a"], "/", JAPANESE, "ja"],
      ["none", [], "/", JAPANESE, "ja"],
      ["three", ["a", "b", "c"], "/", JAPANESE, "ja"],
    ]) {
      await page.locator("#crumbs-" + stage).click();
      await capture(stage, ids, separator, label, language);
    }
  } catch (error) {
    observation.breadcrumbs.failure = error.stack ?? String(error);
    throw error;
  } finally {
    if (note) await note.dispose();
    for (const handles of retained.values()) { await handles.item.dispose(); await handles.anchor.dispose(); }
    await cdp.detach();
    await page.setViewportSize({ width: 1280, height: 720 });
  }
}
