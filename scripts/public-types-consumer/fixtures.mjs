export const webCases = [
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
