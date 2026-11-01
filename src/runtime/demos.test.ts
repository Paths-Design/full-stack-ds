import { describe, it, expect } from "vitest";
import {
  buildReactDemo,
  buildVueDemo,
  buildSvelteDemo,
  buildLitDemo,
  buildAngularDemo,
  buildDemo,
  defaultPropsFromContract,
  callbackPropNames,
  childLabel,
} from "./demos";
import type { ComponentBundle } from "../types/data";

function makeBundle(overrides: Partial<ComponentBundle> = {}): ComponentBundle {
  return {
    name: "Button",
    contractPath: "packages/ds-contracts/Button.contract.json",
    sources: {
      // buildAngularDemo reads the Angular source to discover exported
      // standalone component classes — without this it falls back to a
      // failure-stub host. A realistic shape lets us assert against the
      // bootstrap-ready host the showcase actually uses.
      angular: {
        component: {
          filename: "Button.component.ts",
          code: `import { Component } from "@angular/core";\nexport class ButtonComponent {}`,
        },
      },
    },
    contract: {
      name: "Button",
      layer: "primitive",
      variants: {
        size: ["small", "medium", "large"],
        variant: ["primary", "secondary"],
      },
      props: {
        styled: {
          members: [{ name: "type", type: "string", default: "button" }],
        },
      },
    },
    ...overrides,
  };
}

describe("buildReactDemo", () => {
  it("consumes build-side required alias samples without sharing mutable fixture objects", () => {
    const payload = { author: { name: "Example", handle: "Example", avatar: "Example" }, stats: { likes: 0, replies: 0, reposts: 0 } };
    const bundle = makeBundle({
      name: "Bulletin",
      contract: {
        name: "Bulletin", layer: "compound",
        props: { styled: { members: [
          { name: "author", required: true, propType: { kind: "ref", to: "Author" } },
          { name: "stats", required: true, propType: { kind: "ref", to: "Stats" } },
          { name: "timestamp", required: true, type: "string" },
        ] } },
        types: { Author: { kind: "alias", alias: "{ name: string; handle: string; avatar: string }" }, Stats: { kind: "alias", alias: "{ likes: number; replies: number; reposts: number }" } },
      },
      previewSamples: { values: payload, unsupported: {} },
    });
    const props = defaultPropsFromContract(bundle);
    expect(props).toEqual({ ...payload, timestamp: "2031-03-14T12:00:00Z" });
    (props.stats as { likes: number }).likes = 7;
    expect(defaultPropsFromContract(bundle).stats).toEqual({ likes: 0, replies: 0, reposts: 0 });
    expect(buildReactDemo(bundle)).toContain('stats={{"likes":0,"replies":0,"reposts":0}}');
  });

  it("keeps defaults and variants ahead of projected samples and excludes optional sample entries", () => {
    const bundle = makeBundle({
      contract: { name: "Bulletin", layer: "compound", variants: { mode: ["first", "second"] }, props: {
        styled: { members: [{ name: "mode", required: true, default: "second" }, { name: "authored", required: true, default: { value: 9 } }] },
        designed: { members: [{ name: "payload", required: true, propType: { kind: "ref", to: "Payload" } }] },
        constrained: { members: [{ name: "optional", propType: { kind: "ref", to: "Payload" } }] },
      } },
      previewSamples: { values: { mode: "wrong", authored: { value: 0 }, payload: { value: 3 }, optional: { value: 4 } }, unsupported: {} },
    });
    expect(defaultPropsFromContract(bundle)).toEqual({ mode: "first", authored: { value: 9 }, payload: { value: 3 } });
    expect(buildReactDemo(bundle, { payload: { value: 11 } })).toContain('payload={{"value":11}}');
  });

  it("derives preview defaults from designed required props without changing contract defaults", () => {
    const props = defaultPropsFromContract(
      makeBundle({
        name: "CodeBlock",
        contract: {
          name: "CodeBlock",
          layer: "primitive",
          variants: {},
          props: {
            designed: {
              members: [
                {
                  name: "code",
                  propType: { kind: "string" },
                  required: true,
                },
                {
                  name: "language",
                  propType: { kind: "ref", to: "CodeBlockLanguage" },
                  required: true,
                },
              ],
            },
          },
          types: {
            CodeBlockLanguage: {
              kind: "union",
              values: ["bash", "typescript"],
            },
          },
        },
      }),
    );

    expect(props).toMatchObject({
      code: "const example = true;",
      language: "bash",
    });
  });

  it("emits a JSX snippet with default variants + a child label", () => {
    const out = buildReactDemo(makeBundle());
    // First variant value of each variant axis is used as the default.
    expect(out).toContain('size="small"');
    expect(out).toContain('variant="primary"');
    expect(out).toContain('type="button"');
    // Children: the component name as the visible label.
    expect(out).toContain(">Button</Button>");
    // React harness mounts via createRoot.
    expect(out).toContain('import { Button } from "./Button"');
    expect(out).toContain("createRoot");
  });

  it("respects prop overrides", () => {
    const out = buildReactDemo(makeBundle(), { size: "large", disabled: true });
    expect(out).toContain('size="large"');
    // Boolean true → bare attribute (no `={true}`).
    expect(out).toMatch(/\bdisabled\b(?!=)/);
  });

  it("omits a child label for icon-like components", () => {
    const out = buildReactDemo(makeBundle({ name: "Spinner" }));
    expect(out).toContain("<Spinner");
    // No `>Spinner</Spinner>` since Spinner is in the no-children list.
    expect(out).not.toContain(">Spinner</Spinner>");
  });
});

describe("buildVueDemo", () => {
  it("emits a Vue SFC with <script setup> + <template>", () => {
    const out = buildVueDemo(makeBundle());
    expect(out).toContain('<script setup lang="ts">');
    expect(out).toContain('import Button from "./Button.vue";');
    expect(out).toContain("<template>");
    expect(out).toContain('<Button size="small"');
  });
});

describe("buildSvelteDemo", () => {
  it("emits a Svelte component that imports the .svelte file", () => {
    const out = buildSvelteDemo(makeBundle());
    expect(out).toContain('import Button from "./Button.svelte";');
    expect(out).toContain('<Button size="small"');
  });
});

describe("buildLitDemo", () => {
  it("emits HTML using a lowercase custom-element tag (fsds-{name})", () => {
    // Custom element names must be all-lowercase per the spec. The Lit demo
    // must use `fsds-button`, not `FSDS-button` — even though we receive a
    // PascalCase component name.
    const out = buildLitDemo(makeBundle());
    expect(out).toContain("<fsds-button");
    expect(out).toContain("</fsds-button>");
    expect(out).not.toContain("FSDS-");
  });

  it("renders attributes (not JSX props)", () => {
    // Lit consumes plain HTML attributes — string-valued props become attrs.
    const out = buildLitDemo(makeBundle());
    expect(out).toContain('size="small"');
    expect(out).toContain('variant="primary"');
  });
});

describe("buildAngularDemo", () => {
  it("emits a standalone host component that wraps the target's selector", () => {
    // Angular's preview path mounts a synthesized host via bootstrapApplication.
    // The host must (a) import the standalone component class so it can be
    // declared in the host's `imports: [...]`, and (b) template the component's
    // lowercase selector. Without both, bootstrapApplication errors out at
    // runtime ("selector did not match" or "is not a known element").
    const out = buildAngularDemo(makeBundle());
    expect(out).toContain("@Component(");
    expect(out).toContain('selector: "fsds-host"');
    expect(out).toContain("standalone: true");
    expect(out).toContain("imports: [ButtonComponent]");
    expect(out).toContain("export class HostComponent");
    // The template uses the lowercase custom-element selector for the target.
    expect(out).toContain("<fsds-button");
    expect(out).not.toContain("FSDS-");
  });

  it("imports every standalone class exported from the component source", () => {
    // Compound contracts (Accordion, Dialog, Tabs…) emit multiple sibling
    // classes in one file. The host must import all of them so the template
    // can use any of their selectors.
    const out = buildAngularDemo(
      makeBundle({
        name: "Accordion",
        sources: {
          angular: {
            component: {
              filename: "Accordion.component.ts",
              code: [
                `export class AccordionComponent {}`,
                `export class AccordionItemComponent {}`,
                `export class AccordionTriggerComponent {}`,
              ].join("\n"),
            },
          },
        },
      }),
    );
    expect(out).toContain(
      "imports: [AccordionComponent, AccordionItemComponent, AccordionTriggerComponent]",
    );
  });

  it("binds host inputs from config-bus props instead of baking attrs", () => {
    const out = buildAngularDemo(makeBundle());
    expect(out).toMatch(/<fsds-button[^>]*\[size\]="\$any\(prop\('size'\)\)"/);
    expect(out).toMatch(/<fsds-button[^>]*\[variant\]="\$any\(prop\('variant'\)\)"/);
    expect(out).toMatch(/<fsds-button[^>]*\[type\]="\$any\(prop\('type'\)\)"/);
    expect(out).toContain('data.type !== "fsds:config"');
    expect(out).toContain("this.props = data.props as PreviewProps");
    expect(out).toContain("__fsds_overrides");
  });

  it("kebab-cases multi-word component names to match Angular selectors", () => {
    // Angular emitters use kebab-case selectors (fsds-profile-flag), not the
    // dropped-boundary lowercase used by Lit (fsds-profileflag). Without
    // kebab conversion the compiled host's template references a selector
    // that doesn't exist on any standalone component and the Angular
    // compiler errors with "is not a known element".
    const out = buildAngularDemo(
      makeBundle({
        name: "ProfileFlag",
        sources: {
          angular: {
            component: {
              filename: "ProfileFlag.component.ts",
              code: "export class ProfileFlagComponent {}",
            },
          },
        },
      }),
    );
    expect(out).toContain("<fsds-profile-flag");
    expect(out).not.toContain("<fsds-profileflag");
  });

  it("falls back to a failure-stub host when Angular source is missing", () => {
    // If sources.angular.component is absent the preview cannot bootstrap —
    // we prefer a loud failure over silent empty preview. The stub still
    // compiles so the pipeline doesn't crash, but its template makes the
    // missing-source state visible.
    const out = buildAngularDemo(
      makeBundle({ sources: {} }),
    );
    expect(out).toContain("Angular source missing for Button");
    expect(out).toContain("export class HostComponent");
  });
});

describe("callbackPropNames", () => {
  it("returns names of contract props whose propType.kind is 'callback'", () => {
    const bundle = makeBundle({
      name: "Select",
      contract: {
        name: "Select",
        layer: "compound",
        variants: {},
        props: {
          designed: {
            members: [
              { name: "value", propType: { kind: "string" } },
              {
                name: "onChange",
                propType: { kind: "callback", params: [], returns: { kind: "void" } },
              },
              { name: "open", propType: { kind: "boolean" } },
              {
                name: "onOpenChange",
                propType: { kind: "callback", params: [], returns: { kind: "void" } },
              },
            ],
          },
        },
      },
    });
    expect(callbackPropNames(bundle)).toEqual(["onChange", "onOpenChange"]);
  });

  it("returns an empty array when no prop declares a callback propType (data-driven, no fallback to name sniffing)", () => {
    // "on"-prefixed name alone must NOT be treated as a callback — only the
    // contract's declared propType.kind drives classification. This pins
    // the preview capture surface against silently reverting to naming-
    // convention inference.
    const bundle = makeBundle({
      contract: {
        name: "Button",
        layer: "primitive",
        variants: {},
        props: {
          styled: {
            members: [{ name: "onClickLabel", propType: { kind: "string" } }],
          },
        },
      },
    });
    expect(callbackPropNames(bundle)).toEqual([]);
  });

  it("collects callback props across the styled/designed/constrained buckets, not just one", () => {
    const bundle = makeBundle({
      contract: {
        name: "Field",
        layer: "compound",
        variants: {},
        props: {
          styled: {
            members: [{ name: "onFocus", propType: { kind: "callback", params: [], returns: { kind: "void" } } }],
          },
          designed: {
            members: [{ name: "onBlur", propType: { kind: "callback", params: [], returns: { kind: "void" } } }],
          },
        },
      },
    });
    expect(callbackPropNames(bundle)).toEqual(["onFocus", "onBlur"]);
  });
});

describe("buildDemo (dispatcher)", () => {
  it("routes to the framework-specific builder", () => {
    const bundle = makeBundle();
    expect(buildDemo("react", bundle)).toContain("createRoot");
    expect(buildDemo("vue", bundle)).toContain('import Button from "./Button.vue"');
    expect(buildDemo("svelte", bundle)).toContain('import Button from "./Button.svelte"');
    expect(buildDemo("lit", bundle)).toContain("<fsds-button");
    // Angular dispatches to the host-component builder; assert on a marker
    // that's specific to that path (not just the selector, which Lit also has).
    expect(buildDemo("angular", bundle)).toContain('selector: "fsds-host"');
  });
});

 it("keeps a contract-authored fallback instead of inserting synthetic preview children", () => {
   const component = makeBundle({ name: "AnnotatedSource", contract: { name: "AnnotatedSource", anatomy: { parts: ["root"], dom: { tag: "pre", children: [{ tag: "children" }, { tag: "span", if: "!children", content: "prop:code" }] } } } });
   expect(childLabel(component)).toBe("");
   expect(childLabel(makeBundle())).toBe("Button");
 });
