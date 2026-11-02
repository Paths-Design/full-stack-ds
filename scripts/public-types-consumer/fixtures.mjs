const postcardWebImports = `
import type { PostcardProps as RProps, PostcardStats as RStats, PostcardStatValue as RValue } from "@full-stack-ds/react";
import type { PostcardProps as VProps, PostcardStats as VStats, PostcardStatValue as VValue } from "@full-stack-ds/vue";
import type { PostcardProps as SProps, PostcardStats as SStats, PostcardStatValue as SValue } from "@full-stack-ds/svelte";
import type { PostcardComponent as AComponent, PostcardStats as AStats, PostcardStatValue as AValue } from "@full-stack-ds/angular";
import type { PostcardElement as LComponent, PostcardStats as LStats, PostcardStatValue as LValue } from "@full-stack-ds/lit";
type AProps = Pick<AComponent, "postId" | "author" | "timestamp" | "stats">;
type LProps = Pick<LComponent, "postId" | "author" | "timestamp" | "stats">;
`;
const postcardBase = `const base = { postId: "packed", author: { name: "ليلى 山田", handle: "@layla", avatar: "avatar.png" }, timestamp: "2026-11-01" };`;
const postcardNativeImports = `import type { PostcardProps, PostcardStats, PostcardStatValue } from "@full-stack-ds/react-native";`;

const blockquoteWebImports = `
import type { BlockquoteProps as R } from "@full-stack-ds/react";
import type { BlockquoteProps as V } from "@full-stack-ds/vue";
import type { BlockquoteProps as S } from "@full-stack-ds/svelte";
import type { BlockquoteComponent } from "@full-stack-ds/angular";
import type { BlockquoteElement } from "@full-stack-ds/lit";
type A = Pick<BlockquoteComponent, "cite">;
type L = Pick<BlockquoteElement, "cite">;
`;

const breadcrumbsWebImports = `
import type { BreadcrumbsProps as R } from "@full-stack-ds/react";
import type { BreadcrumbsProps as V } from "@full-stack-ds/vue";
import type { BreadcrumbsProps as S } from "@full-stack-ds/svelte";
import type { BreadcrumbsComponent } from "@full-stack-ds/angular";
import type { BreadcrumbsElement } from "@full-stack-ds/lit";
type A = Pick<BreadcrumbsComponent, "separator">;
type L = Pick<BreadcrumbsElement, "separator">;
`;

export const webCases = [
  {
    name: "breadcrumbs-localized-optional-separator",
    source: breadcrumbsWebImports + ["R", "V", "S", "A", "L"].map(type => `
const ${type.toLowerCase()}Missing: ${type} = {};
const ${type.toLowerCase()}Literal: ${type} = { separator: "日本語" };
const ${type.toLowerCase()}Empty: ${type} = { separator: "" };
const ${type.toLowerCase()}Cleared: ${type} = { separator: undefined };`).join("\n"),
  },
  {
    name: "invalid-breadcrumbs-separator", error: 2322, count: 5, fragment: "number",
    source: breadcrumbsWebImports + ["R", "V", "S", "A", "L"].map(type => `const ${type.toLowerCase()}: ${type} = { separator: 42 };`).join("\n"),
  },
  {
    name: "blockquote-optional-source-url",
    source: blockquoteWebImports + ["R", "V", "S", "A", "L"].map(type => `
const ${type.toLowerCase()}Missing: ${type} = {};
const ${type.toLowerCase()}Source: ${type} = { cite: "https://example.test/مصدر/日本語?edition=2" };
const ${type.toLowerCase()}Relative: ${type} = { cite: "../source?edition=3" };
const ${type.toLowerCase()}Empty: ${type} = { cite: "" };
const ${type.toLowerCase()}Undefined: ${type} = { cite: undefined };`).join("\n"),
  },
  {
    name: "invalid-blockquote-source-url", error: 2322, count: 5, fragment: "number",
    source: blockquoteWebImports + ["R", "V", "S", "A", "L"].map(type => `
const ${type.toLowerCase()}: ${type} = { cite: 42 };`).join("\n"),
  },
  {
    name: "postcard-public-message-providers",
    source: `
import { FsdsMessagesProvider } from "@full-stack-ds/react/primitives";
import { provideFsdsMessages as vueMessages } from "@full-stack-ds/vue";
import { setFsdsMessages as svelteMessages } from "@full-stack-ds/svelte/primitives";
import { provideFsdsMessages as angularMessages, type FsdsMessageCatalog } from "@full-stack-ds/angular";
import { setFsdsMessages as litMessages } from "@full-stack-ds/lit/primitives";
const catalog: FsdsMessageCatalog = { Postcard: { likes: "{count} إعجاب", postLabel: "{name} の投稿" } };
void [FsdsMessagesProvider, vueMessages, svelteMessages, angularMessages, litMessages, catalog];`,
  },
  {
    name: "postcard-engagement-values",
    source: postcardWebImports + postcardBase + ["R", "V", "S", "A", "L"].map(type => `
const ${type.toLowerCase()}Value: ${type}Value = "١٬٢٣٤";
const ${type.toLowerCase()}Stats: ${type}Stats = { likes: 42, replies: 0, reposts: ${type.toLowerCase()}Value };
const ${type.toLowerCase()}Formatted: ${type}Stats = { likes: ${type.toLowerCase()}Value, replies: "٠", reposts: "١٤" };
const ${type.toLowerCase()}: ${type}Props = { ...base, stats: ${type.toLowerCase()}Stats };`).join("\n"),
  },
  ...["stats", "author"].map(field => ({
    name: "missing-postcard-" + field, error: [2322, 2741], count: 5, fragment: field,
    source: postcardWebImports + postcardBase + ["R", "V", "S", "A", "L"].map(type => `
const ${type.toLowerCase()}: ${type}Props = { postId: "packed", timestamp: "2026-11-01", ${field === "stats" ? "author: base.author" : "stats: { likes: 42, replies: 0, reposts: 14 }"} };`).join("\n"),
  })),
  ...[["boolean", "true", "boolean"], ["object", "{ count: 42 }", "count"]].map(([kind, value, fragment]) => ({
    name: "invalid-postcard-" + kind + "-stat", error: 2322, count: 5, fragment,
    source: postcardWebImports + ["R", "V", "S", "A", "L"].map(type => `
const ${type.toLowerCase()}: ${type}Stats = { likes: ${value}, replies: 0, reposts: 14 };`).join("\n"),
  })),
  {
    name: "invalid-managed-link-tab-order", error: 2353, fragment: "tabIndex",
    source: `import type { LinksProps } from "@full-stack-ds/react"; const link: LinksProps = { tabIndex: -1 };`
  },
  {
    name: "portable-link-activation",
    source: `
import type { LinksProps as R, LinkActivationEvent as RE } from "@full-stack-ds/react";
import type { LinksProps as V, LinkActivationEvent as VE } from "@full-stack-ds/vue";
import type { LinksProps as S, LinkActivationEvent as SE } from "@full-stack-ds/svelte";
import type { LinksComponent as A, LinkActivationEvent as AE } from "@full-stack-ds/angular";
import type { LinksElement as L, LinkActivationEvent as LE } from "@full-stack-ds/lit";
const cancel = (event: RE) => { if (!event.defaultPrevented) event.preventDefault(); };
const r: R = { disabled: true, onClick: cancel }; const v: V = { onClick: cancel }; const s: S = { onClick: cancel };
const a: A["onClick"] = cancel; const l: L["onClick"] = cancel;
const event = { defaultPrevented: false, preventDefault() {} };
const same: [RE, VE, SE, AE, LE] = [event, event, event, event, event];
`
  },
  {
    name: "invalid-link-activation-payload", error: 2322, count: 5, fragment: "number",
    source: `
import type { LinksProps as R } from "@full-stack-ds/react";
import type { LinksProps as V } from "@full-stack-ds/vue";
import type { LinksProps as S } from "@full-stack-ds/svelte";
import type { LinksComponent as A } from "@full-stack-ds/angular";
import type { LinksElement as L } from "@full-stack-ds/lit";
const wrong = (event: number) => {};
const r: R = { onClick: wrong }; const v: V = { onClick: wrong }; const s: S = { onClick: wrong };
const a: A["onClick"] = wrong; const l: L["onClick"] = wrong;
`
  },
  {
    name: "native-table-accessibility-attributes",
    source: `
import type { TableHeaderCellProps as R } from "@full-stack-ds/react";
import type { TableHeaderCellProps as V } from "@full-stack-ds/vue";
import type { TableHeaderCellProps as S } from "@full-stack-ds/svelte";
import type { TableHeaderCellAttributes as L } from "@full-stack-ds/lit";
const attributes = { headers: "group", abbr: "Pl.", ariaSort: "ascending", lang: "fr", dir: "ltr", title: "Nombre de places" } as const;
const r: R = attributes; const v: V = attributes; const s: S = attributes; const l: L = attributes;
`
  },
  {
    name: "invalid-table-sort", error: 2322, count: 4, fragment: "random",
    source: `
import type { TableHeaderCellProps as R } from "@full-stack-ds/react";
import type { TableHeaderCellProps as V } from "@full-stack-ds/vue";
import type { TableHeaderCellProps as S } from "@full-stack-ds/svelte";
import type { TableHeaderCellAttributes as L } from "@full-stack-ds/lit";
const r: R = { ariaSort: "random" }; const v: V = { ariaSort: "random" }; const s: S = { ariaSort: "random" }; const l: L = { ariaSort: "random" };
`
  },
  {
    name: "invalid-table-direction", error: 2322, count: 4, fragment: "backwards",
    source: `
import type { TableHeaderCellProps as R } from "@full-stack-ds/react";
import type { TableHeaderCellProps as V } from "@full-stack-ds/vue";
import type { TableHeaderCellProps as S } from "@full-stack-ds/svelte";
import type { TableHeaderCellAttributes as L } from "@full-stack-ds/lit";
const r: R = { dir: "backwards" }; const v: V = { dir: "backwards" }; const s: S = { dir: "backwards" }; const l: L = { dir: "backwards" };
`
  },
  {
    name: "invalid-table-headers", error: 2322, count: 4, fragment: "number",
    source: `
import type { TableCellProps as R } from "@full-stack-ds/react";
import type { TableCellProps as V } from "@full-stack-ds/vue";
import type { TableCellProps as S } from "@full-stack-ds/svelte";
import type { TableCellAttributes as L } from "@full-stack-ds/lit";
const r: R = { headers: 42 }; const v: V = { headers: 42 }; const s: S = { headers: 42 }; const l: L = { headers: 42 };
`
  },
  {
    name: "lit-native-table",
    source: `
import { TableElement, tableCaption, tableHead, tableBody, tableFooter, tableRow, tableHeaderCell, tableCell, type TableCellAttributes, type TableHeaderCellAttributes } from "@full-stack-ds/lit";
const cell: TableCellAttributes = { id: "total", style: "color: red", colSpan: 2, rowSpan: 1, class: "consumer-cell", "data-testid": "total" };
const header: TableHeaderCellAttributes = { scope: "col", colSpan: 2 };
const table = new TableElement();
table.renderContent = slot => [tableCaption(slot ?? "Orders"), tableHead(tableRow(tableHeaderCell("Name", header))), tableBody(tableRow(tableCell("Ada", cell))), tableFooter(tableRow(tableCell("Total")))];
`
  },
  {
    name: "lit-invalid-table-span", error: 2322, count: 1, fragment: "string",
    source: `import { tableCell } from "@full-stack-ds/lit"; tableCell("Total", { colSpan: "wide" });`
  },
  {
    name: "lit-invalid-table-scope", error: 2322, count: 1, fragment: "diagonal",
    source: `import { tableHeaderCell } from "@full-stack-ds/lit"; tableHeaderCell("Name", { scope: "diagonal" });`
  },
  {
    name: "lit-invalid-table-content", error: 2322, count: 1, fragment: "number",
    source: `import { TableElement } from "@full-stack-ds/lit"; new TableElement().renderContent = 42;`
  },
  {
    name: "collided-values-and-types",
    source: `
import { SelectOption as VueOptionComponent, CodeBlockToken as VueTokenComponent, type SelectOption as VOption, type CodeBlockToken as VToken } from "@full-stack-ds/vue";
import { SelectOption as SvelteOptionComponent, CodeBlockToken as SvelteTokenComponent, type SelectOption as SOption, type CodeBlockToken as SToken } from "@full-stack-ds/svelte";
const vOption: VOption = { value: "one", label: "One" };
const sOption: SOption = { value: "one", label: "One" };
const vToken: VToken = { kind: "plain", text: "text" };
const sToken: SToken = { kind: "plain", text: "text" };
void [VueOptionComponent, VueTokenComponent, SvelteOptionComponent, SvelteTokenComponent];
`
  },
  {
    name: "invalid-token-kind", error: 2322, count: 2, fragment: "invalid",
    source: `
import type { CodeBlockToken as V } from "@full-stack-ds/vue";
import type { CodeBlockToken as S } from "@full-stack-ds/svelte";
const v: V = { kind: "invalid", text: "text" };
const s: S = { kind: "invalid", text: "text" };
`
  },
  {
    "name": "valid",
    "source": "\nimport { Button as ReactButton, type ButtonProps as ReactButtonProps } from \"@full-stack-ds/react\";\nimport { Button as VueButton, type ButtonProps as VueButtonProps, type SelectOption as VueSelectOption, type CalendarMode as VueCalendarMode, type TabsTabProps as VueTabsTabProps, type TableCellProps as VueTableCellProps, type StackProps as VueStackProps } from \"@full-stack-ds/vue\";\nimport { Button as SvelteButton, type ButtonProps as SvelteButtonProps, type SelectOption as SvelteSelectOption, type CalendarMode as SvelteCalendarMode, type TabsTabProps as SvelteTabsTabProps, type TableCellProps as SvelteTableCellProps, type StackProps as SvelteStackProps } from \"@full-stack-ds/svelte\";\nimport { ButtonComponent, type ButtonVariant as AngularButtonVariant } from \"@full-stack-ds/angular\";\nimport { ButtonElement, type ButtonVariant as LitButtonVariant, type ListAs } from \"@full-stack-ds/lit\";\nconst react: ReactButtonProps = { variant: \"primary\" };\nconst vue: VueButtonProps = { variant: \"primary\" };\nconst svelte: SvelteButtonProps = { variant: \"primary\" };\nconst vueOption: VueSelectOption = { value: \"one\", label: \"One\" };\nconst svelteOption: SvelteSelectOption = { value: \"one\", label: \"One\" };\nconst vueMode: VueCalendarMode = \"range\";\nconst svelteMode: SvelteCalendarMode = \"range\";\nconst vueTab: VueTabsTabProps = { value: \"one\" };\nconst svelteTab: SvelteTabsTabProps = { value: \"one\" };\nconst vueCell: VueTableCellProps = { colSpan: 2 };\nconst svelteCell: SvelteTableCellProps = { colSpan: 2 };\nconst vueStack: VueStackProps = { layout: \"inline-stack\" };\nconst svelteStack: SvelteStackProps = { layout: \"inline-stack\" };\nconst angularVariant: AngularButtonVariant = \"primary\";\nconst litVariant: LitButtonVariant = \"primary\";\nconst angularProperty: NonNullable<ButtonComponent[\"variant\"]> = \"primary\";\nconst litProperty: NonNullable<ButtonElement[\"variant\"]> = \"primary\";\nconst listAs: ListAs = \"ul\";\nvoid [ReactButton, VueButton, SvelteButton, ButtonComponent, ButtonElement];\n"
  },
  {
    "name": "invalid-alias-variants",
    "error": 2322,
    "count": 5,
    "fragment": "invalid",
    "source": "\nimport type { ButtonVariant as R } from \"@full-stack-ds/react\";\nimport type { ButtonVariant as V } from \"@full-stack-ds/vue\";\nimport type { ButtonVariant as S } from \"@full-stack-ds/svelte\";\nimport type { ButtonVariant as A } from \"@full-stack-ds/angular\";\nimport type { ButtonVariant as L } from \"@full-stack-ds/lit\";\nconst r: R = \"invalid\"; const v: V = \"invalid\"; const s: S = \"invalid\"; const a: A = \"invalid\"; const l: L = \"invalid\";"
  },
  {
    "name": "invalid-prop-variants",
    "error": 2322,
    "count": 2,
    "fragment": "invalid",
    "source": "\nimport type { ButtonProps as V } from \"@full-stack-ds/vue\";\nimport type { ButtonProps as S } from \"@full-stack-ds/svelte\";\nconst v: V = { variant: \"invalid\" }; const s: S = { variant: \"invalid\" };"
  },
  {
    "name": "invalid-options",
    "error": 2322,
    "count": 2,
    "fragment": "number",
    "source": "\nimport type { SelectOption as V } from \"@full-stack-ds/vue\";\nimport type { SelectOption as S } from \"@full-stack-ds/svelte\";\nconst v: V = { value: 3, label: \"Three\" }; const s: S = { value: 3, label: \"Three\" };"
  },
  {
    "name": "missing-required-part",
    "error": [
      2322,
      2741
    ],
    "count": 2,
    "fragment": "value",
    "source": "\nimport type { TabsTabProps as V } from \"@full-stack-ds/vue\";\nimport type { TabsTabProps as S } from \"@full-stack-ds/svelte\";\nconst v: V = {}; const s: S = {};"
  },
  {
    "name": "invalid-cell-span",
    "error": 2322,
    "count": 2,
    "fragment": "string",
    "source": "\nimport type { TableCellProps as V } from \"@full-stack-ds/vue\";\nimport type { TableCellProps as S } from \"@full-stack-ds/svelte\";\nconst v: V = { colSpan: \"wide\" }; const s: S = { colSpan: \"wide\" };"
  },
  {
    "name": "invalid-stack-layout",
    "error": 2322,
    "count": 2,
    "fragment": "grid",
    "source": "\nimport type { StackProps as V } from \"@full-stack-ds/vue\";\nimport type { StackProps as S } from \"@full-stack-ds/svelte\";\nconst v: V = { layout: \"grid\" }; const s: S = { layout: \"grid\" };"
  }
];

export const nativeCases = [
  {
    name: "breadcrumbs-localized-optional-separator",
    source: `import type { BreadcrumbsProps } from "@full-stack-ds/react-native";
const omitted: BreadcrumbsProps = {};
const literal: BreadcrumbsProps = { separator: "日本語", ariaLabel: "مسار التنقل" };
const empty: BreadcrumbsProps = { separator: "" };
const cleared: BreadcrumbsProps = { separator: undefined };`,
  },
  {
    name: "invalid-breadcrumbs-separator", error: 2322, fragment: "number",
    source: `import type { BreadcrumbsProps } from "@full-stack-ds/react-native"; const trail: BreadcrumbsProps = { separator: 42 };`,
  },
  {
    name: "blockquote-optional-source-url-compatibility",
    source: `
import type { BlockquoteProps } from "@full-stack-ds/react-native";
const omitted: BlockquoteProps = {};
const source: BlockquoteProps = { cite: "https://example.test/مصدر/日本語" };
const empty: BlockquoteProps = { cite: "" };
const cleared: BlockquoteProps = { cite: undefined };
`,
  },
  {
    name: "invalid-blockquote-source-url", error: 2322, fragment: "number",
    source: `import type { BlockquoteProps } from "@full-stack-ds/react-native"; const quote: BlockquoteProps = { cite: 42 };`,
  },
  {
    name: "postcard-engagement-values",
    source: postcardNativeImports + postcardBase + `
const value: PostcardStatValue = "١٬٢٣٤";
const stats: PostcardStats = { likes: 42, replies: 0, reposts: value };
const formatted: PostcardStats = { likes: value, replies: "٠", reposts: "١٤" };
const post: PostcardProps = { ...base, stats, children: "مرحبا 日本語" };`,
  },
  ...["stats", "author"].map(field => ({
    name: "missing-postcard-" + field, error: [2322, 2741], fragment: field,
    source: postcardNativeImports + postcardBase + `
const post: PostcardProps = { postId: "packed", timestamp: "2026-11-01", ${field === "stats" ? "author: base.author" : "stats: { likes: 42, replies: 0, reposts: 14 }"} };`,
  })),
  ...[["boolean", "true", "boolean"], ["object", "{ count: 42 }", "count"]].map(([kind, value, fragment]) => ({
    name: "invalid-postcard-" + kind + "-stat", error: 2322, fragment,
    source: postcardNativeImports + `const stats: PostcardStats = { likes: ${value}, replies: 0, reposts: 14 };`,
  })),
  {
    name: "portable-link-activation",
    source: `
import type { LinksProps, LinkActivationEvent } from "@full-stack-ds/react-native";
const cancel = (event: LinkActivationEvent) => { if (!event.defaultPrevented) event.preventDefault(); };
const link: LinksProps = { href: "https://example.test/docs", disabled: true, onClick: cancel, children: "المستندات" };
`
  },
  {
    name: "invalid-link-activation-payload", error: 2322, fragment: "number",
    source: `import type { LinksProps } from "@full-stack-ds/react-native"; const link: LinksProps = { onClick: (event: number) => {} };`
  },
  {
    name: "readonly-link-activation-state", error: 2540, fragment: "defaultPrevented",
    source: `import type { LinkActivationEvent } from "@full-stack-ds/react-native"; function cancel(event: LinkActivationEvent) { event.defaultPrevented = true; }`
  },
  {
    "name": "valid",
    "source": "\nimport { Button, type ButtonProps, type ButtonVariant, type SelectOption } from \"@full-stack-ds/react-native\";\nimport type { StackProps } from \"@full-stack-ds/react-native/primitives\";\nimport type { FsdsTheme } from \"@full-stack-ds/react-native/tokens\";\nconst button: ButtonProps = { variant: \"primary\" };\nconst variant: ButtonVariant = \"outline\";\nconst option: SelectOption = { value: \"one\", label: \"One\" };\nconst stack: StackProps = { layout: \"native\" };\nconst theme: FsdsTheme = { brand: \"consumer\", tokens: { \"color.example\": \"#123456\" } };\nvoid Button;"
  },
  {
    "name": "invalid-variant",
    "error": 2322,
    "fragment": "invalid",
    "source": "\nimport type { ButtonVariant } from \"@full-stack-ds/react-native\";\nconst variant: ButtonVariant = \"invalid\";"
  },
  {
    "name": "invalid-option",
    "error": 2322,
    "fragment": "number",
    "source": "\nimport type { SelectOption } from \"@full-stack-ds/react-native\";\nconst option: SelectOption = { value: 3, label: \"Three\" };"
  }
];
