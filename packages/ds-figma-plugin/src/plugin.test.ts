import { beforeEach, describe, expect, it, vi } from "vitest";

const buttonCssBlocks = [
  {
    selector: ".button",
    declarations: {
      "--fsds-button-size-gap": "var(--fsds-core-spacing-size-04, 8px)",
      "--fsds-button-size-radius": "var(--fsds-core-shape-radius-full, 9999px)",
      "--fsds-button-size-border": "var(--fsds-core-shape-border-width-hairline, 1px)",
      "--fsds-button-color-background-default":
        "var(--fsds-semantic-color-action-background-primary-default, #d9292b)",
      "--fsds-button-color-foreground-default":
        "var(--fsds-semantic-color-foreground-inverse, #fafafa)",
      "--fsds-button-color-border-default":
        "var(--fsds-semantic-color-border-light, #fceaea)",
      "--fsds-button-size-padding-block-medium":
        "var(--fsds-core-spacing-size-04, 8px)",
      "--fsds-button-size-padding-inline-medium":
        "var(--fsds-core-spacing-size-05, 12px)",
      "--fsds-button-size-min-height-medium":
        "var(--fsds-core-dimension-action-min-height, 36px)",
      "--fsds-button-size-font-size-medium":
        "var(--fsds-core-typography-ramp-4, 1rem)",
    },
  },
  {
    selector: ".button--small",
    declarations: {
      "--fsds-button-size-padding-block-medium":
        "var(--fsds-core-spacing-size-03, 4px)",
      "--fsds-button-size-padding-inline-medium":
        "var(--fsds-core-spacing-size-04, 8px)",
      "--fsds-button-size-min-height-medium":
        "var(--fsds-core-dimension-action-min-height-small, 28px)",
      "--fsds-button-size-font-size-medium":
        "var(--fsds-core-typography-ramp-3, 0.875rem)",
    },
  },
  {
    selector: ".button--medium",
    declarations: {
      "--fsds-button-size-padding-block-medium":
        "var(--fsds-core-spacing-size-04, 8px)",
      "--fsds-button-size-padding-inline-medium":
        "var(--fsds-core-spacing-size-05, 12px)",
      "--fsds-button-size-min-height-medium":
        "var(--fsds-core-dimension-action-min-height, 36px)",
      "--fsds-button-size-font-size-medium":
        "var(--fsds-core-typography-ramp-4, 1rem)",
    },
  },
  {
    selector: ".button--large",
    declarations: {
      "--fsds-button-size-padding-block-medium":
        "var(--fsds-core-spacing-size-05, 12px)",
      "--fsds-button-size-padding-inline-medium":
        "var(--fsds-core-spacing-size-06, 16px)",
      "--fsds-button-size-min-height-medium":
        "var(--fsds-core-dimension-action-min-height-large, 48px)",
      "--fsds-button-size-font-size-medium":
        "var(--fsds-core-typography-ramp-5, 1.125rem)",
    },
  },
  {
    selector: ".button--primary",
    declarations: {
      "--fsds-button-color-background-default":
        "var(--fsds-semantic-color-action-background-primary-default, #d9292b)",
      "--fsds-button-color-foreground-default":
        "var(--fsds-semantic-color-foreground-inverse, #fafafa)",
      "--fsds-button-color-border-default":
        "var(--fsds-semantic-color-action-background-primary-default, #d9292b)",
    },
  },
  {
    selector: ".button--tertiary",
    declarations: {
      "--fsds-button-color-background-default": "transparent",
      "--fsds-button-color-foreground-default":
        "var(--fsds-semantic-color-foreground-primary, #141414)",
      "--fsds-button-color-border-default": "transparent",
    },
  },
  {
    selector: ".button--secondary",
    declarations: {
      "--fsds-button-color-background-default":
        "var(--fsds-semantic-color-action-background-secondary-default, #efefef)",
      "--fsds-button-color-foreground-default":
        "var(--fsds-semantic-color-foreground-primary, #141414)",
      "--fsds-button-color-border-default":
        "var(--fsds-semantic-color-border-default, #8f8f8f)",
    },
  },
  {
    selector: ".button--destructive",
    declarations: {
      "--fsds-button-color-background-default":
        "var(--fsds-semantic-color-action-background-danger-default, #d9292b)",
      "--fsds-button-color-foreground-default":
        "var(--fsds-semantic-color-foreground-inverse, #fafafa)",
      "--fsds-button-color-border-default":
        "var(--fsds-semantic-color-action-background-danger-default, #d9292b)",
    },
  },
  {
    selector: ".button--ghost",
    declarations: {
      "--fsds-button-color-background-default": "transparent",
      "--fsds-button-color-foreground-default":
        "var(--fsds-semantic-color-foreground-primary, #141414)",
      "--fsds-button-color-border-default": "transparent",
    },
  },
  {
    selector: ".button--outline",
    declarations: {
      "--fsds-button-color-background-default": "transparent",
      "--fsds-button-color-foreground-default":
        "var(--fsds-semantic-color-foreground-primary, #141414)",
      "--fsds-button-color-border-default":
        "var(--fsds-semantic-color-border-default, #8f8f8f)",
    },
  },
];

const chipCssBlocks = [
  {
    selector: ".chip",
    declarations: {
      "--fsds-chip-color-background-default":
        "var(--fsds-semantic-color-action-background-secondary-default, #fafafa)",
      "--fsds-chip-color-foreground-default":
        "var(--fsds-semantic-color-action-foreground-secondary-default, #141414)",
      "--fsds-chip-color-border-default":
        "var(--fsds-semantic-color-action-border-secondary-default, #aeaeae)",
      "--fsds-chip-size-padding-horizontal":
        "var(--fsds-core-spacing-size-04, 8px)",
      "--fsds-chip-size-padding-vertical":
        "var(--fsds-core-spacing-size-02, 2px)",
      "--fsds-chip-size-gap": "var(--fsds-core-spacing-size-02, 2px)",
      "--fsds-chip-size-radius": "var(--fsds-core-shape-radius-full, 9999px)",
      "--fsds-chip-size-border":
        "var(--fsds-core-shape-border-width-hairline, 1px)",
      "--fsds-chip-text-size":
        "var(--fsds-semantic-typography-body-04, 12px)",
    },
  },
];

const statusCssBlocks = [
  {
    selector: ".status",
    declarations: {
      "--fsds-status-color-background":
        "var(--fsds-semantic-color-background-primary, #ffffff)",
      "--fsds-status-color-foreground-primary":
        "var(--fsds-semantic-color-foreground-primary, #141414)",
      "--fsds-status-color-border":
        "var(--fsds-semantic-color-border-primary, #f29495)",
      "--fsds-status-size-radius":
        "var(--fsds-core-shape-radius-full, 9999px)",
      "--fsds-status-size-padding-default":
        "var(--fsds-core-spacing-size-04, 8px)",
      "--fsds-status-size-border":
        "var(--fsds-core-shape-border-width-hairline, 1px)",
    },
  },
];

vi.mock("./generated/components/index.js", () => ({
  figmaComponentRegistry: {
    Button: {
      schemaVersion: 1,
      component: {
        name: "Button",
        cssPrefix: "button",
        rootElement: "button",
        effectiveRole: "button",
      },
      anatomy: [
        { name: "root", layoutVariant: null },
        { name: "spinner", layoutVariant: null },
        { name: "loadingText", layoutVariant: null },
      ],
      props: [
        { name: "variant", type: "ButtonVariant", required: false, defaultExpr: '"primary"' },
      ],
      variants: {
        size: ["small", "medium", "large"],
        variant: ["primary", "secondary", "tertiary", "ghost", "destructive", "outline"],
      },
      css: { blocks: buttonCssBlocks },
    },
    Chip: {
      schemaVersion: 1,
      component: {
        name: "Chip",
        cssPrefix: "chip",
        rootElement: "button",
        effectiveRole: "button",
      },
      anatomy: [
        { name: "root", layoutVariant: null },
        { name: "icon", layoutVariant: null },
        { name: "text", layoutVariant: null },
      ],
      props: [
        { name: "variant", type: "ChipVariant", required: false, defaultExpr: '"default"' },
        { name: "size", type: "ChipSize", required: false, defaultExpr: '"medium"' },
      ],
      variants: {
        variant: ["default", "selected", "dismissible"],
        size: ["small", "medium", "large"],
      },
      css: { blocks: chipCssBlocks },
    },
    Status: {
      schemaVersion: 1,
      component: {
        name: "Status",
        cssPrefix: "status",
        rootElement: "span",
        effectiveRole: null,
      },
      anatomy: [
        { name: "root", layoutVariant: null },
        { name: "icon", layoutVariant: null },
        { name: "label", layoutVariant: null },
      ],
      props: [
        { name: "status", type: "StatusKind", required: false, defaultExpr: '"info"' },
      ],
      variants: {
        status: ["info", "success", "warning", "danger", "error"],
      },
      css: { blocks: statusCssBlocks },
    },
    Card: {
      // Ineligible: no variants. Should fall through to placeholder path.
      schemaVersion: 1,
      component: {
        name: "Card",
        cssPrefix: "card",
        rootElement: "div",
        effectiveRole: null,
      },
      anatomy: [{ name: "root", layoutVariant: null }],
      props: [],
      variants: {},
      css: {
        blocks: [{ selector: ".card", declarations: { padding: "16px" } }],
      },
    },
    Avatar: {
      // Eligible variants, but NOT in this slice's allowlist. Falls through
      // to placeholder_deferred.
      schemaVersion: 1,
      component: {
        name: "Avatar",
        cssPrefix: "avatar",
        rootElement: "span",
        effectiveRole: null,
      },
      anatomy: [{ name: "root", layoutVariant: null }],
      props: [],
      variants: { size: ["sm", "md", "lg"] },
      css: {
        blocks: [{ selector: ".avatar", declarations: { padding: "8px" } }],
      },
    },
  },
  figmaPrimitiveRegistry: {
    Stack: {
      schemaVersion: 1,
      primitive: { kind: "stack", name: "Stack" },
      variants: { variant: ["vertical", "horizontal"] },
      figma: {
        intendedUse: "figma-library-materialization",
        componentSetName: "Stack",
        propertySource: "primitive contract Stack.variant",
      },
    },
  },
}));

type NodeKind =
  | "page"
  | "frame"
  | "text"
  | "component"
  | "componentSet"
  | "instance";

type MockSolidPaint = {
  type: "SOLID";
  color: { r: number; g: number; b: number };
  opacity?: number;
};

type MockNode = {
  kind: NodeKind;
  name?: string;
  children: MockNode[];
  pluginData: Record<string, string>;
  characters?: string;
  fontSize?: number;
  layoutMode?: string;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  minHeight?: number;
  cornerRadius?: number;
  strokeWeight?: number;
  width?: number;
  height?: number;
  fills?: readonly MockSolidPaint[];
  strokes?: readonly MockSolidPaint[];
  parent?: MockNode;
  master?: MockNode;
  appendChild(child: MockNode): void;
  setPluginData(key: string, value: string): void;
  getPluginData(key: string): string;
  resize(width: number, height: number): void;
  createInstance?(): MockNode;
  componentProperties: Array<{
    name: string;
    type: string;
    options?: { defaultValue?: string | boolean; variantOptions?: string[] };
  }>;
  addComponentProperty(
    name: string,
    type: string,
    options?: { defaultValue?: string | boolean; variantOptions?: string[] },
  ): string;
};

function createNode(kind: NodeKind): MockNode {
  return {
    kind,
    children: [],
    pluginData: {},
    componentProperties: [],
    appendChild(child: MockNode): void {
      child.parent = this;
      this.children.push(child);
    },
    setPluginData(key: string, value: string): void {
      this.pluginData[key] = value;
    },
    getPluginData(key: string): string {
      return this.pluginData[key] ?? "";
    },
    addComponentProperty(name, type, options): string {
      this.componentProperties.push({ name, type, options });
      return name;
    },
    resize(width: number, height: number): void {
      this.width = width;
      this.height = height;
    },
  };
}

type MockUi = {
  postMessage: ReturnType<typeof vi.fn>;
  onmessage: ((message: unknown) => void) | undefined;
  resize: ReturnType<typeof vi.fn>;
};

type MockCodegen = {
  on: ReturnType<typeof vi.fn>;
  handler: ((event: { node: MockNode; language: string }) => unknown) | undefined;
};

function setupFigma(
  options: {
    editorType?: "figma" | "dev";
    mode?: "default" | "codegen";
  } = {},
): {
  pages: MockNode[];
  components: MockNode[];
  componentSets: MockNode[];
  texts: MockNode[];
  notify: ReturnType<typeof vi.fn>;
  closePlugin: ReturnType<typeof vi.fn>;
  showUI: ReturnType<typeof vi.fn>;
  ui: MockUi;
  codegen: MockCodegen;
} {
  const pages: MockNode[] = [];
  const components: MockNode[] = [];
  const componentSets: MockNode[] = [];
  const texts: MockNode[] = [];
  const notify = vi.fn();
  const closePlugin = vi.fn();
  const loadFontAsync = vi.fn(() => Promise.resolve());
  const showUI = vi.fn();
  const ui: MockUi = {
    postMessage: vi.fn(),
    onmessage: undefined,
    resize: vi.fn(),
  };
  const codegen: MockCodegen = {
    on: vi.fn((_type: string, handler: (event: { node: MockNode; language: string }) => unknown) => {
      codegen.handler = handler;
    }),
    handler: undefined,
  };

  vi.stubGlobal("figma", {
    editorType: options.editorType ?? "figma",
    mode: options.mode ?? "default",
    createPage: vi.fn(() => {
      const page = createNode("page");
      pages.push(page);
      return page;
    }),
    createFrame: vi.fn(() => createNode("frame")),
    createText: vi.fn(() => {
      const text = createNode("text");
      texts.push(text);
      return text;
    }),
    createComponent: vi.fn(() => {
      const component = createNode("component");
      component.createInstance = (): MockNode => {
        const instance = createNode("instance");
        instance.master = component;
        return instance;
      };
      components.push(component);
      return component;
    }),
    combineAsVariants: vi.fn(
      (variants: MockNode[], parent: MockNode): MockNode => {
        const set = createNode("componentSet");
        for (const variant of variants) {
          variant.parent = set;
          set.children.push(variant);
        }
        set.parent = parent;
        parent.children.push(set);
        componentSets.push(set);
        return set;
      },
    ),
    loadFontAsync,
    setCurrentPageAsync: vi.fn(() => Promise.resolve()),
    showUI,
    ui,
    codegen,
    notify,
    closePlugin,
  });

  return { pages, components, componentSets, texts, notify, closePlugin, showUI, ui, codegen };
}

describe("Figma plugin: generic component-set materializer", () => {
  it("routes Button (allowlisted, eligible) into component-set path", async () => {
    const { main } = await import("./plugin.js");
    const { componentSets } = setupFigma();
    await main();

    const buttonSet = componentSets.find((set) => set.name === "Button");
    expect(buttonSet).toBeDefined();
    // 3 sizes × 6 variants = 18.
    expect(buttonSet!.children).toHaveLength(18);
    expect(buttonSet!.pluginData["fsds.materializer"]).toBe("component-set");
    expect(buttonSet!.pluginData["fsds.eligibility.reason"]).toBe(
      "component_set_materialized",
    );
  });

  it("routes Chip (allowlisted, eligible) into the same generic path", async () => {
    const { main } = await import("./plugin.js");
    const { componentSets } = setupFigma();
    await main();

    const chipSet = componentSets.find((set) => set.name === "Chip");
    expect(chipSet).toBeDefined();
    // 3 variants × 3 sizes = 9.
    expect(chipSet!.children).toHaveLength(9);
    expect(chipSet!.pluginData["fsds.materializer"]).toBe("component-set");
    expect(chipSet!.pluginData["fsds.eligibility.reason"]).toBe(
      "component_set_materialized",
    );
    expect(chipSet!.pluginData["fsds.variantMatrix.size"]).toBe("9");

    // Variant names derived from descriptor — same path as Button.
    const names = chipSet!.children.map((c) => c.name);
    expect(names).toContain("variant=default, size=small");
    expect(names).toContain("variant=selected, size=medium");
    expect(names).toContain("variant=dismissible, size=large");
  });

  it("routes Status (allowlisted, single axis) into the same generic path", async () => {
    const { main } = await import("./plugin.js");
    const { componentSets } = setupFigma();
    await main();

    const statusSet = componentSets.find((set) => set.name === "Status");
    expect(statusSet).toBeDefined();
    // 5 statuses.
    expect(statusSet!.children).toHaveLength(5);
    expect(statusSet!.pluginData["fsds.materializer"]).toBe("component-set");

    const names = statusSet!.children.map((c) => c.name);
    expect(names).toEqual([
      "status=info",
      "status=success",
      "status=warning",
      "status=danger",
      "status=error",
    ]);
  });

  it("Card (no variants) classifies as placeholder_no_variants and falls back to leaf path", async () => {
    const { main } = await import("./plugin.js");
    const { components, componentSets } = setupFigma();
    await main();

    expect(componentSets.find((set) => set.name === "Card")).toBeUndefined();
    const cardComponent = components.find((c) => c.name === "Card");
    expect(cardComponent).toBeDefined();
    expect(cardComponent!.pluginData["fsds.materializer"]).toBe(
      "placeholder-leaf",
    );
    expect(cardComponent!.pluginData["fsds.eligibility.reason"]).toBe(
      "placeholder_no_variants",
    );
  });

  it("Avatar (has variants but NOT allowlisted) classifies as placeholder_deferred", async () => {
    const { main } = await import("./plugin.js");
    const { components, componentSets } = setupFigma();
    await main();

    expect(componentSets.find((set) => set.name === "Avatar")).toBeUndefined();
    const avatarComponent = components.find((c) => c.name === "Avatar");
    expect(avatarComponent).toBeDefined();
    expect(avatarComponent!.pluginData["fsds.materializer"]).toBe(
      "placeholder-leaf",
    );
    expect(avatarComponent!.pluginData["fsds.eligibility.reason"]).toBe(
      "placeholder_deferred",
    );
  });

  it("Button per-variant geometry is derived from descriptor CSS via generic semantic extraction", async () => {
    const { main } = await import("./plugin.js");
    const { componentSets } = setupFigma();
    await main();

    const buttonSet = componentSets.find((set) => set.name === "Button")!;
    const small = buttonSet.children.find(
      (c) => c.name === "size=small, variant=primary",
    )!;
    const medium = buttonSet.children.find(
      (c) => c.name === "size=medium, variant=primary",
    )!;
    const large = buttonSet.children.find(
      (c) => c.name === "size=large, variant=primary",
    )!;

    // Padding-block / padding-inline / minHeight differ across sizes,
    // pulled from `.button--<size>` declarations via generic
    // padding-block/padding-inline/min-height name matching.
    expect(small.paddingTop).toBe(4);
    expect(small.paddingLeft).toBe(8);
    expect(small.minHeight).toBe(28);
    expect(medium.paddingTop).toBe(8);
    expect(medium.paddingLeft).toBe(12);
    expect(medium.minHeight).toBe(36);
    expect(large.paddingTop).toBe(12);
    expect(large.paddingLeft).toBe(16);
    expect(large.minHeight).toBe(48);

    // Background fill: primary block carries hex fallback → resolved.
    expect(medium.fills).toBeDefined();
    expect(medium.fills!.length).toBe(1);
    expect(medium.fills![0].type).toBe("SOLID");
    expect(medium.fills![0].color.r).toBeCloseTo(217 / 255, 2);

    // Transparent background variants (ghost/tertiary/outline) → fills cleared.
    const tertiary = buttonSet.children.find(
      (c) => c.name === "size=medium, variant=tertiary",
    )!;
    expect(tertiary.fills).toEqual([]);

    // fontSize differentiation: small=0.875rem→14, medium=1rem→16, large=1.125rem→18.
    expect(small.children[0].fontSize).toBeCloseTo(14, 1);
    expect(medium.children[0].fontSize).toBeCloseTo(16, 1);
    expect(large.children[0].fontSize).toBeCloseTo(18, 1);
  });

  it("Chip variants share base-block styling (no per-variant CSS in descriptor → no differentiation, but no invented styling either)", async () => {
    const { main } = await import("./plugin.js");
    const { componentSets } = setupFigma();
    await main();

    const chipSet = componentSets.find((set) => set.name === "Chip")!;
    // All 9 Chip variants pull from the same base block — geometry and
    // fills should match across them. This is the *correct* behavior
    // when the contract doesn't carry per-variant CSS; the materializer
    // must not invent differentiation.
    const first = chipSet.children[0];
    const last = chipSet.children[8];

    // Base block declares `--fsds-chip-size-padding-horizontal: 8px` and
    // `--fsds-chip-size-padding-vertical: 2px` (fallback hex extracted).
    expect(first.paddingTop).toBe(2);
    expect(first.paddingLeft).toBe(8);
    expect(last.paddingTop).toBe(2);
    expect(last.paddingLeft).toBe(8);

    // Background fill resolved from base block's --fsds-chip-color-background-default
    // (#fafafa). Same for all variants.
    expect(first.fills).toBeDefined();
    expect(first.fills!.length).toBe(1);
    expect(first.fills![0].color.r).toBeCloseTo(0xfa / 255, 2);
    expect(last.fills![0].color.r).toBeCloseTo(0xfa / 255, 2);

    // fontSize from --fsds-chip-text-size: 12px.
    expect(first.children[0].fontSize).toBe(12);

    // Label text is the descriptor's component name.
    expect(first.children[0].characters).toBe("Chip");
  });

  it("Status variants share base-block styling, label text matches component name", async () => {
    const { main } = await import("./plugin.js");
    const { componentSets } = setupFigma();
    await main();

    const statusSet = componentSets.find((set) => set.name === "Status")!;
    const info = statusSet.children.find((c) => c.name === "status=info")!;
    const error = statusSet.children.find((c) => c.name === "status=error")!;

    // Both should have the same base-block padding (8px from
    // --fsds-status-size-padding-default).
    expect(info.paddingTop).toBe(8);
    expect(error.paddingTop).toBe(8);

    // Both should have the same background (#ffffff).
    expect(info.fills![0].color.r).toBeCloseTo(1, 2);
    expect(error.fills![0].color.r).toBeCloseTo(1, 2);

    // Label is component name.
    expect(info.children[0].characters).toBe("Status");
    expect(error.children[0].characters).toBe("Status");
  });

  it("switches currentPage to the components page BEFORE any combineAsVariants call (live-only bug regression)", async () => {
    // Live evidence: figma.combineAsVariants requires components and parent
    // on the same page; createComponent binds to figma.currentPage. The
    // mocked test surface previously hid this. Assert that the production
    // code calls setCurrentPageAsync at least once before any combineAsVariants.
    const order: string[] = [];
    const setCurrentPageAsync = vi.fn(() => {
      order.push("setCurrentPageAsync");
      return Promise.resolve();
    });
    vi.stubGlobal("figma", {
      createPage: vi.fn(() => createNode("page")),
      createFrame: vi.fn(() => createNode("frame")),
      createText: vi.fn(() => createNode("text")),
      createComponent: vi.fn(() => {
        const c = createNode("component");
        c.createInstance = (): MockNode => {
          const i = createNode("instance");
          i.master = c;
          return i;
        };
        return c;
      }),
      combineAsVariants: vi.fn((variants: MockNode[], parent: MockNode) => {
        order.push("combineAsVariants");
        const set = createNode("componentSet");
        for (const v of variants) { v.parent = set; set.children.push(v); }
        set.parent = parent;
        parent.children.push(set);
        return set;
      }),
      loadFontAsync: vi.fn(() => Promise.resolve()),
      setCurrentPageAsync,
      notify: vi.fn(),
      closePlugin: vi.fn(),
    });

    const { main } = await import("./plugin.js");
    await main();

    expect(setCurrentPageAsync).toHaveBeenCalledTimes(1);
    // The first call to setCurrentPageAsync MUST come before the first
    // combineAsVariants. If we ever flip the order, live materialization
    // breaks with "Grouped nodes must be in the same page as the parent".
    const firstSetIdx = order.indexOf("setCurrentPageAsync");
    const firstCombineIdx = order.indexOf("combineAsVariants");
    expect(firstSetIdx).toBeGreaterThanOrEqual(0);
    expect(firstCombineIdx).toBeGreaterThan(firstSetIdx);
  });

  it("classifyDescriptorForMaterialization is exported and pure", async () => {
    const { classifyDescriptorForMaterialization } = await import("./plugin.js");
    // No css blocks → placeholder_missing_css.
    expect(
      classifyDescriptorForMaterialization({
        schemaVersion: 1,
        component: { name: "Button", cssPrefix: "button" },
        anatomy: [],
        props: [],
        variants: { size: ["small"] },
      }),
    ).toBe("placeholder_missing_css");

    // Empty variants → placeholder_no_variants.
    expect(
      classifyDescriptorForMaterialization({
        schemaVersion: 1,
        component: { name: "Button", cssPrefix: "button" },
        anatomy: [],
        props: [],
        variants: {},
        css: { blocks: [{ selector: ".button", declarations: {} }] },
      }),
    ).toBe("placeholder_no_variants");

    // Variants + css + allowlisted → component_set_materialized.
    expect(
      classifyDescriptorForMaterialization({
        schemaVersion: 1,
        component: { name: "Button", cssPrefix: "button" },
        anatomy: [],
        props: [],
        variants: { size: ["small"] },
        css: { blocks: [{ selector: ".button", declarations: {} }] },
      }),
    ).toBe("component_set_materialized");

    // Variants + css + NOT allowlisted → placeholder_deferred.
    expect(
      classifyDescriptorForMaterialization({
        schemaVersion: 1,
        component: { name: "Tooltip", cssPrefix: "tooltip" },
        anatomy: [],
        props: [],
        variants: { variant: ["default"] },
        css: { blocks: [{ selector: ".tooltip", declarations: {} }] },
      }),
    ).toBe("placeholder_deferred");
  });

  it("scaffolds full page: 1 Stack set + 3 component sets (Button/Chip/Status) + 2 placeholder leaves (Card/Avatar)", async () => {
    const { main } = await import("./plugin.js");
    const { pages, components, componentSets, notify, closePlugin } = setupFigma();
    await main();

    expect(pages.map((p) => p.name)).toEqual(["Full Stack DS / Components"]);
    // 1 Stack set + 3 generic-materialized sets = 4 component sets.
    expect(componentSets).toHaveLength(4);
    const setNames = componentSets.map((s) => s.name).sort();
    expect(setNames).toEqual(["Button", "Chip", "Stack", "Status"]);

    // Card + Avatar materialized as placeholder leaves.
    const leafNames = components
      .filter((c) => c.parent?.kind === "page")
      .map((c) => c.name);
    expect(leafNames).toContain("Card");
    expect(leafNames).toContain("Avatar");

    expect(notify).toHaveBeenCalledWith(
      "Full Stack DS: scaffolded Stack + 5 component(s).",
    );
    expect(closePlugin).toHaveBeenCalledWith(
      "Scaffolded Stack + 5 component(s).",
    );
  });
});

/**
 * `figma.ui.onmessage` is void-returning in the real Figma API (and in
 * `figma.d.ts` here) — `plugin.ts`'s handler fires-and-catches its internal
 * promise rather than returning it. Awaiting the call itself only waits for
 * the synchronous prefix; this flushes the microtask queue so any `await`s
 * inside `handleUiMessage` (e.g. `materializeRegistry`'s
 * `setCurrentPageAsync`) have settled before assertions run.
 */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("Figma plugin: UI wiring (A1)", () => {
  it("opens the UI, posts fsds:init with a descriptor-registry-backed model, and does not auto-materialize", async () => {
    const { main } = await import("./plugin.js");
    const { showUI, ui, componentSets, pages } = setupFigma();

    await main({ autoMaterialize: false });

    expect(showUI).toHaveBeenCalledTimes(1);
    // fsds:init must be posted before any materialization command arrives —
    // this is the falsification target in the verification report.
    expect(ui.postMessage).toHaveBeenCalledTimes(1);
    const initCall = ui.postMessage.mock.calls[0][0];
    expect(initCall.type).toBe("fsds:init");
    expect(initCall.model.componentCount).toBe(5);
    expect(initCall.model.summaries.map((s: { name: string }) => s.name).sort()).toEqual(
      ["Avatar", "Button", "Card", "Chip", "Status"],
    );

    // No materialization happens just from opening the UI.
    expect(componentSets).toHaveLength(0);
    expect(pages).toHaveLength(0);
    expect(typeof ui.onmessage).toBe("function");
  });

  it("handles fsds:materialize (scope=allowlist): materializes only allowlisted eligible sets, posts fsds:materialization-complete", async () => {
    const { main } = await import("./plugin.js");
    const { componentSets, components, ui } = setupFigma();

    await main({ autoMaterialize: false });
    ui.onmessage!({ type: "fsds:materialize", scope: "allowlist" });
    await flushMicrotasks();

    // scope=allowlist pre-filters candidates to COMPONENT_SET_ALLOWLIST
    // (selectDescriptors), so only Button/Chip/Status are ever considered —
    // Card and Avatar (not in the allowlist) are not materialized at all
    // under this scope, not even as placeholder leaves.
    const setNames = componentSets.map((s) => s.name).sort();
    expect(setNames).toEqual(["Button", "Chip", "Stack", "Status"]);
    expect(components.some((c) => c.name === "Card")).toBe(false);
    expect(components.some((c) => c.name === "Avatar")).toBe(false);

    const completeCall = ui.postMessage.mock.calls.find(
      (call: unknown[]) => (call[0] as { type: string }).type === "fsds:materialization-complete",
    );
    expect(completeCall).toBeDefined();
    const report = completeCall![0].report;
    expect(report.materialized.sort()).toEqual(["Button", "Chip", "Status"]);
    expect(report.placeholders).toEqual([]);
    expect(report.skipped).toEqual([]);
  });

  it("handles fsds:materialize (scope=selected, componentName): materializes only the named descriptor", async () => {
    const { main } = await import("./plugin.js");
    const { componentSets, ui } = setupFigma();

    await main({ autoMaterialize: false });
    ui.onmessage!({ type: "fsds:materialize", scope: "selected", componentName: "Button" });
    await flushMicrotasks();

    expect(componentSets.map((s) => s.name).sort()).toEqual(["Button", "Stack"]);
  });

  it("handles fsds:resize by forwarding width/height to figma.ui.resize", async () => {
    const { main } = await import("./plugin.js");
    const { ui } = setupFigma();

    await main({ autoMaterialize: false });
    await ui.onmessage!({ type: "fsds:resize", width: 800, height: 640 });

    expect(ui.resize).toHaveBeenCalledWith(800, 640);
  });

  it("handles fsds:close by calling figma.closePlugin with no report", async () => {
    const { main } = await import("./plugin.js");
    const { ui, closePlugin } = setupFigma();

    await main({ autoMaterialize: false });
    await ui.onmessage!({ type: "fsds:close" });

    expect(closePlugin).toHaveBeenCalledWith();
  });

  it("FALSIFICATION TARGET: fsds:init must be posted before the UI can request materialization", async () => {
    // This test's assertion (postMessage called with fsds:init) is the one
    // the verification report's falsification step disables in plugin.ts to
    // show a red run, then restores.
    const { main } = await import("./plugin.js");
    const { ui } = setupFigma();

    await main({ autoMaterialize: false });

    expect(ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "fsds:init" }),
    );
  });
});

describe("Figma plugin: single eligibility authority (A2)", () => {
  it("plugin.ts re-exports classifyDescriptorForMaterialization from eligibility.ts — exactly one definition exists in src/", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const srcDir = path.resolve(__dirname, ".");
    const files = fs
      .readdirSync(srcDir)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));

    const definitionPattern = /^\s*export function classifyDescriptorForMaterialization/m;
    const definingFiles = files.filter((name) =>
      definitionPattern.test(fs.readFileSync(path.join(srcDir, name), "utf8")),
    );

    expect(definingFiles).toEqual(["eligibility.ts"]);
  });

  it("ui-model.ts's buildFigmaUiModel and plugin.ts's materializer agree on eligibility for every descriptor (same shared classifier)", async () => {
    const { buildFigmaUiModel } = await import("./ui-model.js");
    const { main } = await import("./plugin.js");
    const { componentSets, components } = setupFigma();

    const model = buildFigmaUiModel();
    await main();

    for (const summary of model.summaries) {
      if (summary.materializationStatus === "component_set_materialized") {
        expect(componentSets.some((s) => s.name === summary.name)).toBe(true);
      } else {
        const leaf = components.find(
          (c) => c.name === summary.name && c.parent?.kind === "page",
        );
        expect(leaf).toBeDefined();
        expect(leaf!.pluginData["fsds.eligibility.reason"]).toBe(
          summary.materializationStatus,
        );
      }
    }
  });
});

describe("Figma plugin: Dev Mode codegen handler (A3)", () => {
  // The `figma.codegen.on("generate", ...)` registration happens in
  // plugin.ts's module-top-level entry branch (`if (typeof figma !==
  // "undefined") { if (editorType === "dev" && mode === "codegen") ... }`),
  // which runs exactly once per module instantiation. `vi.resetModules()`
  // forces a fresh module instance so each test's `figma` stub (set up
  // BEFORE the import) is the one the entry branch observes.
  beforeEach(() => {
    vi.resetModules();
  });

  it("resolves the descriptor from fsds.component plugin data and honors fsds.variantRow, falling back to defaults for unknown target languages", async () => {
    const { codegen } = setupFigma({ editorType: "dev", mode: "codegen" });
    await import("./plugin.js");

    expect(codegen.on).toHaveBeenCalledTimes(1);

    const node = createNode("component");
    node.setPluginData("fsds.component", "Button");
    node.setPluginData("fsds.variantRow", JSON.stringify({ size: "large", variant: "destructive" }));

    const result = codegen.handler!({ node, language: "svelte" }) as Array<{
      title: string;
      language: string;
      code: string;
    }>;

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Svelte");
    expect(result[0].code).toContain('import { Button } from "@full-stack-ds/svelte";');
    expect(result[0].code).toContain('size="large"');
    expect(result[0].code).toContain('variant="destructive"');
  });

  it("falls back to the descriptor's default variant values when fsds.variantRow is absent", async () => {
    const { codegen } = setupFigma({ editorType: "dev", mode: "codegen" });
    await import("./plugin.js");

    const node = createNode("component");
    node.setPluginData("fsds.component", "Chip");
    // No fsds.variantRow set.

    const result = codegen.handler!({ node, language: "react" }) as Array<{
      code: string;
    }>;

    // Chip's first declared variant/size values are "default"/"small".
    expect(result[0].code).toContain('variant="default"');
    expect(result[0].code).toContain('size="small"');
  });

  it("falls back to an unrecognized-target-safe react preview when language is not a known CodegenTarget", async () => {
    const { codegen } = setupFigma({ editorType: "dev", mode: "codegen" });
    await import("./plugin.js");

    const node = createNode("component");
    node.setPluginData("fsds.component", "Status");

    const result = codegen.handler!({ node, language: "haskell" }) as Array<{
      title: string;
    }>;

    expect(result[0].title).toBe("React");
  });

  it("returns the no-metadata plaintext result for an unknown selection (no fsds.component plugin data)", async () => {
    const { codegen } = setupFigma({ editorType: "dev", mode: "codegen" });
    await import("./plugin.js");

    const node = createNode("frame");
    // No fsds.component plugin data recorded.

    const result = codegen.handler!({ node, language: "react" }) as Array<{
      language: string;
      code: string;
    }>;

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe("PLAINTEXT");
    expect(result[0].code).toContain("No Full Stack DS component contract metadata found");
  });

  it("does NOT register the codegen handler when editorType/mode is not dev+codegen — opens the UI instead", async () => {
    const { codegen, showUI } = setupFigma({ editorType: "figma", mode: "default" });
    await import("./plugin.js");

    expect(codegen.on).not.toHaveBeenCalled();
    expect(showUI).toHaveBeenCalledTimes(1);
  });
});

describe("Figma plugin: lifecycle preserves a headless run path (A5, falsification-pinned)", () => {
  it("main() with default options (no UI round-trip) completes materialization and closes the plugin", async () => {
    const { main } = await import("./plugin.js");
    const { closePlugin, notify, componentSets } = setupFigma();

    await main();

    expect(componentSets.length).toBeGreaterThan(0);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(closePlugin).toHaveBeenCalledTimes(1);
  });

  it("main({ autoMaterialize: false }) opens the UI with fallback markup when __html__ is not a string (dist/ui.html missing at build time)", async () => {
    const { main } = await import("./plugin.js");
    const { showUI } = setupFigma();

    // vite.config.ts's pluginConfig `define.__html__` becomes the literal
    // string "undefined" (not the identifier) if dist/ui.html doesn't
    // exist at build time — readUiHtmlForPlugin() already returns fallback
    // markup in that case, so __html__ is always a string once bundled.
    // This test instead simulates the *runtime* typeof-guard path
    // (declare const __html__: string | undefined) by never defining the
    // global at all, which is exactly what happens when the module is
    // loaded outside of the Vite `define` substitution (e.g. under Vitest).
    await main({ autoMaterialize: false });

    expect(showUI).toHaveBeenCalledTimes(1);
    const [html] = showUI.mock.calls[0];
    // Under Vitest, __html__ is never defined by a bundler `define`, so the
    // typeof-guard's fallback branch is what actually executes here —
    // this pins that the fallback is soft (a string), not a throw.
    expect(typeof html).toBe("string");
  });
});
