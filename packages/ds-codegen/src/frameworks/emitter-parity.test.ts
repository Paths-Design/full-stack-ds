import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import { corpusIR } from "./corpus-fixtures.js";
import { generateReactComponentSource } from "./react/component-source.js";
import { generateVueComponentSource } from "./vue/component-source.js";
import { generateSvelteComponentSource } from "./svelte/component-source.js";
import { generateLitComponentSource } from "./lit/component-source.js";
import { generateAngularComponentSource } from "./angular/component-source.js";
import { createVueEmitter } from "./vue/factory.js";
import { createSvelteEmitter } from "./svelte/factory.js";

/**
 * Cross-emitter parity. The contract is the single source of truth, so when
 * the same IR is rendered through React and Vue, the externally observable
 * surface (the props interface) must declare every attribute the template
 * binds. Concretely: a Vue template that binds `:data-testid` must declare
 * the prop in `interface Props {}`, otherwise consumers get TS errors at
 * usage sites.
 *
 * Vue stores a declared prop under its camelized key, so `data-testid` is
 * declared and read as `dataTestid`; a `props['data-testid']` read is always
 * undefined and silently drops the consumer's value.
 */
describe("emitter parity: Vue Props interface declares every bound attribute", () => {
  it("simple primitive without dom tree binds class + data-testid", () => {
    const contract = makeSimpleContract();
    const vue = generateVueComponentSource(buildComponentIR(contract));

    // Template should bind these
    expect(vue).toContain(`:class="classNames"`);
    expect(vue).toContain(`:data-testid="props.dataTestid"`);
    // A hyphenated bracket read never matches Vue's camelized prop key.
    expect(vue).not.toContain(`props['`);

    // Props interface must declare them
    expect(propsInterface(vue)).toContain(`class?: string;`);
    expect(propsInterface(vue)).toContain(`dataTestid?: string;`);
  });

  it("dom-tree primitive (Spinner-shaped) declares class + data-testid in Props", () => {
    const contract = makeDomTreeContract();
    const vue = generateVueComponentSource(buildComponentIR(contract));

    expect(propsInterface(vue)).toContain(`class?: string;`);
    expect(propsInterface(vue)).toContain(`dataTestid?: string;`);
  });

  it("dialog labeling props come from the contract rather than emitter injection", () => {
    const contract = makeDialogContract();
    const vue = generateVueComponentSource(buildComponentIR(contract));

    expect(propsInterface(vue)).toContain(`ariaLabel?: string;`);
    expect(propsInterface(vue)).toContain(`ariaLabelledby?: string;`);
    expect(propsInterface(vue)).not.toContain(`"aria-label"?: string;`);
  });

  it("React and Vue Props expose the same root-attribute additions for the same contract", () => {
    const contract = makeSimpleContract();
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    const vue = generateVueComponentSource(buildComponentIR(contract));

    // React declares `className` (its convention), Vue declares `class`.
    // Both must declare data-testid; neither should silently differ on the
    // set of extra root attrs.
    expect(react).toContain(`className?: string;`);
    expect(react).toContain(`"data-testid"?: string;`);
    expect(propsInterface(vue)).toContain(`class?: string;`);
    expect(propsInterface(vue)).toContain(`dataTestid?: string;`);
  });
});

describe("emitter parity: Lit legacy Stack accessibility surface", () => {
  it("puts the contract role on the public custom-element host", () => {
    const lit = generateLitComponentSource(corpusIR("Card"));

    expect(lit).toContain(
      `if (!this.hasAttribute("role")) this.setAttribute("role", "group");`,
    );
    expect(lit).not.toContain(`<fsds-stack role="group"`);
  });
});

describe("ARIA boolean-ish attrs satisfy React's Booleanish type", () => {
  it("React: aria-selected on a string channel coerces via String() + ternary", () => {
    const contract = makeAriaBoolContract("aria-selected", "string");
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    expect(react).toContain(
      `aria-selected={activeTab !== undefined ? (String(activeTab) as "true" | "false") : undefined}`,
    );
  });

  it("React: aria-expanded on a boolean channel passes through unwrapped", () => {
    const contract = makeAriaBoolContract("aria-expanded", "boolean");
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    expect(react).toContain("aria-expanded={activeTab}");
    expect(react).not.toContain("String(activeTab)");
  });

  it("React: non-aria-boolean attrs pass through unwrapped", () => {
    const contract = makeAriaBoolContract("aria-controls", "string");
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    expect(react).not.toContain("String(");
  });

  it("Vue: aria-selected on a string channel coerces via undefined-check + Boolean()", () => {
    const contract = makeAriaBoolContract("aria-selected", "string");
    const vue = generateVueComponentSource(buildComponentIR(contract));
    expect(vue).toContain(
      `:aria-selected="behavior.activeTab.value === undefined ? undefined : Boolean(behavior.activeTab.value)"`,
    );
  });
});

describe("textContent binding renders as child text node", () => {
  it("React: textContent prop becomes a child interpolation, not a JSX attr", () => {
    const contract = makeTextContentContract();
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    // The bug: textContent emitted as JSX attribute, which React rejects
    expect(react).not.toContain("textContent={");
    // The fix: emitted as a child expression inside the span tag
    expect(react).toMatch(/<span[^>]*>\s*\{summary\}\s*<\/span>/);
  });

  it("Vue: textContent prop becomes a {{ ... }} interpolation", () => {
    const contract = makeTextContentContract();
    const vue = generateVueComponentSource(buildComponentIR(contract));
    expect(vue).not.toContain("textContent=");
    expect(vue).toContain("{{ props.summary }}");
  });
});

describe("dialog labeling remains contract-owned", () => {
  it("React: emits a contract-authored aria-labelledby once", () => {
    const contract = makeDialogWithLiteralLabelledby();
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    const jsxLine = react
      .split("\n")
      .find((l) => l.includes('role="dialog"') && l.includes("aria-labelledby"));
    expect(jsxLine).toBeTruthy();
    const labelledbyCount = (jsxLine!.match(/aria-labelledby/g) ?? []).length;
    expect(labelledbyCount).toBe(1);
  });

  it("React: does not invent labeling props for a bare dialog", () => {
    const contract = makeDialogBare();
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    expect(react).not.toContain("aria-label={ariaLabel}");
    expect(react).not.toContain("aria-labelledby={ariaLabelledBy}");
    expect(react).not.toContain(`"aria-label"?: string;`);
  });
});

describe("nested interactive labels remain contract-owned", () => {
  it("Command exposes and binds the search input label in React and Vue", () => {
    const ir = corpusIR("Command");
    const react = generateReactComponentSource(ir, "../../primitives");
    const vue = generateVueComponentSource(ir);

    // The label's default is the contract message; an explicit prop wins over
    // the provided catalog, which wins over that default.
    expect(react).toContain(`searchLabel?: string;`);
    expect(react).toContain(`searchLabel: "Search commands"`);
    expect(react).toContain(`const searchLabel = searchLabelProp ?? fsdsMessages.searchLabel;`);
    expect(react).toContain(`aria-label={searchLabel}`);
    expect(propsInterface(vue)).toContain(`searchLabel?: string;`);
    expect(vue).toContain(`searchLabel: "searchLabel"`);
    expect(vue).toContain(`:aria-label="props.searchLabel"`);
    expect(react).toContain(`{slots?.items}`);
    expect(react).not.toContain(`<div className="command__item" role="option">`);
    expect(vue).toContain(`<slot name="items" />`);
  });

  it("Command derives its input/listbox IDREF pair per instance in every web emitter", () => {
    const ir = corpusIR("Command");
    const sources = {
      react: generateReactComponentSource(ir, "../../primitives"),
      vue: generateVueComponentSource(ir),
      svelte: generateSvelteComponentSource(ir),
      lit: generateLitComponentSource(ir),
      angular: generateAngularComponentSource(ir),
    };

    for (const source of Object.values(sources)) {
      expect(source).not.toContain("fsds-command-listbox");
    }
    expect(sources.react).toContain('aria-controls={`${instanceId}-list`}');
    expect(sources.react).toContain('id={`${instanceId}-list`}');
    expect(sources.vue).toContain(':aria-controls="`${instanceId}-list`"');
    expect(sources.vue).toContain(':id="`${instanceId}-list`"');
    expect(sources.svelte).toContain('aria-controls={`${instanceId}-list`}');
    expect(sources.svelte).toContain('id={`${instanceId}-list`}');
    expect(sources.lit).toContain('aria-controls="command-list"');
    expect(sources.lit).toContain('id="command-list"');
    expect(sources.angular).toContain(
      '[attr.aria-controls]="instanceId + \'-list\'"',
    );
    expect(sources.angular).toContain('[attr.id]="instanceId + \'-list\'"');
  });

  it("Command realizes consumer-composed item anatomy as typed subcomponents in every web emitter", () => {
    const ir = corpusIR("Command");
    const expectedParts = [
      "groupHeading",
      "groupItems",
      "itemIcon",
      "itemContent",
      "itemLabel",
      "itemDescription",
    ];
    for (const part of expectedParts) {
      expect(ir.compoundParts.map((entry) => entry.name)).toContain(part);
    }

    const react = generateReactComponentSource(ir, "../../primitives");
    const angular = generateAngularComponentSource(ir);
    const lit = generateLitComponentSource(ir);
    expect(react).toContain("export function CommandItemIcon");
    expect(react).toContain('<Stack as="span" className={classNames}');
    expect(angular).toContain("export class CommandItemIconComponent");
    expect(angular).toContain('<fsds-stack as="span"');
    expect(lit).toContain("export class CommandItemIconElement");
    expect(lit).toContain('<fsds-stack as="span"');

    const options = {
      componentsRoot: "/tmp/fsds-emitter-parity/components",
      contractsRoot: "/tmp/fsds-emitter-parity/contracts",
    };
    const vueFiles = createVueEmitter().emitComponent(ir, options);
    const svelteFiles = createSvelteEmitter().emitComponent(ir, options);
    const vueIcon = vueFiles.find((file) =>
      file.relativePath.endsWith("CommandItemIcon.vue"),
    );
    const svelteIcon = svelteFiles.find((file) =>
      file.relativePath.endsWith("CommandItemIcon.svelte"),
    );
    expect(vueIcon?.contents).toContain('<Stack as="span"');
    expect(svelteIcon?.contents).toContain('<Stack as="span"');
  });

  it("Select names its nested trigger through a consumer-overridable prop", () => {
    const ir = corpusIR("Select");
    const react = generateReactComponentSource(ir, "../../primitives");
    const vue = generateVueComponentSource(ir);

    expect(react).toContain(`triggerLabel?: string;`);
    expect(react).toContain(`triggerLabel: "Select an option"`);
    expect(react).toContain(`const triggerLabel = triggerLabelProp ?? fsdsMessages.triggerLabel;`);
    expect(react).toContain(`aria-label={triggerLabel}`);
    expect(
      react
        .split("\n")
        .find((line) => line.includes(`<button className="select__trigger"`)),
    ).toContain(`aria-expanded={open}`);
    expect(propsInterface(vue)).toContain(`triggerLabel?: string;`);
    expect(vue).toContain(`:aria-label="props.triggerLabel"`);
    expect(
      vue
        .split("\n")
        .find((line) => line.includes(`<button :class="'select__trigger'"`)),
    ).toContain(`:aria-expanded="behavior.open.value"`);
  });

  it("OTP names every field and does not emit a fabricated dangling description id", () => {
    const ir = corpusIR("OTP");
    const react = generateReactComponentSource(ir, "../../primitives");
    const vue = generateVueComponentSource(ir);

    expect(react).toContain(`fieldLabel?: string;`);
    expect(react).toContain(`aria-label={fieldLabel}`);
    expect(react).toContain(`aria-describedby={ariaDescribedby}`);
    expect(react).not.toContain(`otp-error-id`);
    expect(vue).toContain(`:aria-label="props.fieldLabel"`);
    expect(vue).toContain(`:aria-describedby="props.ariaDescribedby"`);
    expect(vue).not.toContain(`otp-error-id`);
  });
});

describe("React component scan identity", () => {
  it.each(["Accordion", "Tabs"])(
    "%s compound roots retain the same data-fsds identity as generic roots",
    (name) => {
      const react = generateReactComponentSource(
        corpusIR(name),
        "../../primitives",
      );

      expect(react).toContain(
        `data-fsds-component="${name.toLowerCase()}"`,
      );
    },
  );
});

describe("renderBinding: host attribute drives event-handler shape", () => {
  it("boolean channel onChange → currentTarget.checked unwrap", () => {
    const contract = makeChannelContract("onChange", "boolean");
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    expect(react).toContain(
      "(e) => setExpanded((e.currentTarget as HTMLInputElement).checked)",
    );
    expect(react).not.toMatch(/onClick=\{.*e\.target\.checked/);
  });

  it("boolean channel onClick → toggle callback (no e.target.checked)", () => {
    const contract = makeChannelContract("onClick", "boolean");
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    // The bug fix: onClick must NOT reference e.target.checked
    expect(react).not.toContain("e.target.checked");
    // Toggle reads the channel value from closure scope since the
    // generated setter is `(next: T) => void` (no updater form).
    expect(react).toContain("setExpanded(!expanded)");
  });

  it("string channel onChange → currentTarget.value unwrap", () => {
    const contract = makeChannelContract("onChange", "string");
    const react = generateReactComponentSource(
      buildComponentIR(contract),
      "../../primitives",
    );
    expect(react).toContain(
      "(e) => setExpanded((e.currentTarget as HTMLInputElement).value)",
    );
  });

  it("Vue: boolean channel onClick → toggle callback", () => {
    const contract = makeChannelContract("onClick", "boolean");
    const vue = generateVueComponentSource(buildComponentIR(contract));
    // Vue: @click="() => setExpanded(!behavior.expanded.value)" — no .checked
    expect(vue).not.toContain(".checked");
    expect(vue).toContain("setExpanded(!behavior.expanded.value)");
  });
});

/**
 * Tabs-shaped: a non-boolean (string) channel bound to an ARIA boolean-ish
 * attribute. React's `aria-selected` type is `Booleanish`, not raw string —
 * so the emitter must wrap the value in `String(...)`.
 */
function makeAriaBoolContract(
  attr: string,
  valueType: "string" | "boolean" = "string",
): ComponentContract {
  return {
    name: "AriaBool",
    cssPrefix: "ab",
    anatomy: {
      parts: ["root", "tab"],
      dom: {
        tag: "div",
        part: "root",
        children: [
          {
            tag: "button",
            part: "tab",
            attrs: { type: "button" },
            bindings: { [attr]: "channel:activeTab.value" },
          },
        ],
      },
    },
    channels: {
      activeTab: {
        value: "value",
        defaultValue: "defaultValue",
        onChange: "onValueChange",
        valueType,
      },
    },
    props: {
      styled: {
        members: [
          { name: "value", type: valueType },
          { name: "defaultValue", type: valueType },
          {
            name: "onValueChange",
            type: `(value: ${valueType}) => void`,
          },
        ],
      },
    },
  };
}

/**
 * Details-shaped contract with a textContent binding on an inner span.
 * The bug emitted this as `<span textContent={summary} />`, which TypeScript
 * rejects because React has no `textContent` prop.
 */
function makeTextContentContract(): ComponentContract {
  return {
    name: "Disclosure",
    cssPrefix: "disclosure",
    anatomy: {
      parts: ["root", "summary", "summaryText"],
      dom: {
        tag: "details",
        part: "root",
        children: [
          {
            tag: "summary",
            part: "summary",
            children: [
              {
                tag: "span",
                part: "summaryText",
                // IR-DOM-BINDING-CAPABILITY-01: inner content lives in
                // the `content` field, not in bindings.textContent.
                content: "prop:summary",
              },
            ],
          },
        ],
      },
    },
    props: {
      styled: {
        members: [
          { name: "summary", type: "string", required: true },
        ],
      },
    },
  };
}

/**
 * Dialog where the contract author has already declared an aria-labelledby
 * literal on the dialog node. The emitter must not also inject a forwarded
 * aria-labelledby — that produced TS17001 (duplicate JSX attribute).
 */
function makeDialogWithLiteralLabelledby(): ComponentContract {
  return {
    name: "DialogLit",
    cssPrefix: "dialog-lit",
    anatomy: {
      parts: ["root", "modal"],
      dom: {
        tag: "div",
        part: "root",
        children: [
          {
            tag: "div",
            part: "modal",
            attrs: {
              role: "dialog",
              "aria-modal": "true",
              "aria-labelledby": "dialog-title-id",
            },
          },
        ],
      },
    },
    props: {
      styled: {
        members: [{ name: "open", type: "boolean" }],
      },
    },
  };
}

/**
 * Dialog with no contract-level aria-labelledby — emitter should still
 * inject the prop-forwarded attribute so axe finds an accessible name.
 */
function makeDialogBare(): ComponentContract {
  return {
    name: "DialogBare",
    cssPrefix: "dialog-bare",
    anatomy: {
      parts: ["root", "modal"],
      dom: {
        tag: "div",
        part: "root",
        children: [
          { tag: "div", part: "modal", attrs: { role: "dialog" } },
        ],
      },
    },
    props: {
      styled: {
        members: [{ name: "open", type: "boolean" }],
      },
    },
  };
}

function makeChannelContract(
  hostAttr: "onChange" | "onClick",
  valueType: "boolean" | "string",
): ComponentContract {
  return {
    name: "Toggleable",
    cssPrefix: "toggleable",
    anatomy: {
      parts: ["root", "trigger"],
      dom: {
        tag: "div",
        part: "root",
        children: [
          {
            tag: "button",
            part: "trigger",
            attrs: { type: "button" },
            // IR-DOM-BINDING-CAPABILITY-01: event handlers live in the
            // dedicated `events` field, keyed by unprefixed event name.
            // The test parameter `hostAttr` ("onChange" | "onClick") maps
            // to the corresponding event name.
            events: {
              [hostAttr === "onChange" ? "change" : "click"]:
                "channel:expanded.onChange",
            },
          },
        ],
      },
    },
    channels: {
      expanded: {
        value: "expanded",
        defaultValue: "defaultExpanded",
        onChange: "onExpandedChange",
        valueType,
      },
    },
    props: {
      styled: {
        members: [
          { name: "expanded", type: valueType },
          { name: "defaultExpanded", type: valueType },
          {
            name: "onExpandedChange",
            type: `(value: ${valueType}) => void`,
          },
        ],
      },
    },
  };
}

function propsInterface(source: string): string {
  // Extract the Vue `interface Props { ... }` block. We assert on this region
  // alone so test failures point at the right place rather than matching
  // template content that happens to look like a prop declaration.
  const match = source.match(/interface Props \{[\s\S]*?\n\}/);
  if (!match) throw new Error("Vue source has no `interface Props` block");
  return match[0];
}

function makeSimpleContract(): ComponentContract {
  return {
    name: "Simple",
    cssPrefix: "simple",
    anatomy: { parts: ["root"] },
    props: {
      styled: {
        members: [{ name: "label", type: "string" }],
      },
    },
  };
}

function makeDomTreeContract(): ComponentContract {
  return {
    name: "Spinner",
    cssPrefix: "spinner",
    anatomy: {
      parts: ["root", "visual"],
      dom: {
        tag: "div",
        part: "root",
        children: [
          { tag: "span", part: "visual", attrs: { "aria-hidden": "true" } },
        ],
      },
    },
    props: {
      styled: {
        members: [{ name: "label", type: "string" }],
      },
    },
  };
}

function makeDialogContract(): ComponentContract {
  return {
    name: "Dialog",
    cssPrefix: "dialog",
    anatomy: {
      parts: ["root"],
      dom: {
        tag: "div",
        part: "root",
        attrs: { role: "dialog" },
        bindings: {
          "aria-label": "prop:ariaLabel",
          "aria-labelledby": "prop:ariaLabelledby",
        },
      },
    },
    props: {
      styled: {
        members: [
          { name: "open", type: "boolean" },
          { name: "ariaLabel", type: "string" },
          { name: "ariaLabelledby", type: "string" },
        ],
      },
    },
    a11y: { role: "dialog", labeling: ["aria-label", "aria-labelledby"] },
  };
}
