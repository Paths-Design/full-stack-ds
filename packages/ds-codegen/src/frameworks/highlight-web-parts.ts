import type { ComponentIR, HighlightTransformIR } from "../ir.js";
import { highlightTokenTypes } from "../highlight/token-types.js";

/** SFC presentation parts shared by generated source and custom annotations. */
export function vueHighlightParts(ir: ComponentIR, transform: HighlightTransformIR): { name: string; content: string }[] {
  const line = `${ir.name}${capitalize(transform.linePart!)}`;
  const token = `${ir.name}${capitalize(transform.tokenPart)}`;
  const palette = tokenKinds(ir, transform);
  return [
    {
      name: line,
      content: `<script setup lang="ts">\nconst props = withDefaults(defineProps<{ number: number; ending?: string }>(), { ending: "" });\n</script>\n\n<template>\n  <span class="${ir.cssPrefix}__${transform.linePart}"><span class="${ir.cssPrefix}__${transform.gutterPart}" :data-line="props.number" aria-hidden="true"></span><slot />{{ props.ending }}</span>\n</template>\n`,
    },
    {
      name: token,
      content: `<script setup lang="ts">\nconst props = defineProps<{ kind: ${palette} }>();\n</script>\n\n<template>\n  <span class="${ir.cssPrefix}__${transform.tokenPart}" :data-token="props.kind"><slot /></span>\n</template>\n`,
    },
  ];
}

export function svelteHighlightParts(ir: ComponentIR, transform: HighlightTransformIR): { name: string; content: string }[] {
  const line = `${ir.name}${capitalize(transform.linePart!)}`;
  const token = `${ir.name}${capitalize(transform.tokenPart)}`;
  const palette = tokenKinds(ir, transform);
  return [
    {
      name: line,
      content: `<script lang="ts">\n  import type { Snippet } from "svelte";\n  let { number, ending = "", children }: { number: number; ending?: string; children?: Snippet } = $props();\n</script>\n\n<span class="${ir.cssPrefix}__${transform.linePart}"><span class="${ir.cssPrefix}__${transform.gutterPart}" data-line={number} aria-hidden="true"></span>{@render children?.()}{ending}</span>\n`,
    },
    {
      name: token,
      content: `<script lang="ts">\n  import type { Snippet } from "svelte";\n  let { kind, children }: { kind: ${palette}; children?: Snippet } = $props();\n</script>\n\n<span class="${ir.cssPrefix}__${transform.tokenPart}" data-token={kind}>{@render children?.()}</span>\n`,
    },
  ];
}

export function angularHighlightParts(ir: ComponentIR, transform: HighlightTransformIR): string {
  const line = `${ir.name}${capitalize(transform.linePart!)}`;
  const token = `${ir.name}${capitalize(transform.tokenPart)}`;
  const { kindName } = highlightTokenTypes(ir, transform);
  return `@Component({\n` +
    `  selector: "fsds-${ir.cssPrefix}-line",\n` +
    `  standalone: true,\n` +
    `  template: \`<span class="${ir.cssPrefix}__${transform.linePart}"><span class="${ir.cssPrefix}__${transform.gutterPart}" [attr.data-line]="number" aria-hidden="true"></span><ng-content />{{ ending }}</span>\`,\n` +
    `  changeDetection: ChangeDetectionStrategy.OnPush,\n` +
    `})\n` +
    `export class ${line}Component {\n` +
    `  @Input({ required: true }) number!: number;\n` +
    `  @Input() ending = "";\n` +
    `}\n\n` +
    `@Component({\n` +
    `  selector: "fsds-${ir.cssPrefix}-token",\n` +
    `  standalone: true,\n` +
    `  template: \`<span class="${ir.cssPrefix}__${transform.tokenPart}" [attr.data-token]="kind"><ng-content /></span>\`,\n` +
    `  changeDetection: ChangeDetectionStrategy.OnPush,\n` +
    `})\n` +
    `export class ${token}Component {\n` +
    `  @Input({ required: true }) kind!: ${kindName};\n` +
    `}`;
}

export function litHighlightParts(ir: ComponentIR, transform: HighlightTransformIR): string {
  const line = `${ir.name}${capitalize(transform.linePart!)}`;
  const token = `${ir.name}${capitalize(transform.tokenPart)}`;
  const { kindName } = highlightTokenTypes(ir, transform);
  const kind = ir.definedTypes[kindName];
  if (kind?.kind !== "union" || !kind.values) throw new Error(`${ir.name}: highlight token kinds require a union`);
  const slot = (suffix: string): string => {
    const name = `${ir.cssPrefix}.${suffix}`;
    const value = ir.tokenScopes.flatMap((scope) => scope.values).find((entry) => entry.name === name);
    const fallback = typeof value?.rawValue === "string" ? value.rawValue : "currentColor";
    return `var(${value?.cssVar ?? `--fsds-${name.replace(/\./g, "-")}`}, ${fallback})`;
  };
  const tokenRules = kind.values.map((value) =>
    `    .${ir.cssPrefix}__${transform.tokenPart}[data-token="${value}"] { color: ${slot(`${transform.tokenPart}.color.${value}`)}; }`,
  ).join("\n");
  return [
    `export class ${line}Element extends LitElement {`,
    `  static override styles = css\``,
    `    :host { display: inline; white-space: pre; }`,
    `    .${ir.cssPrefix}__${transform.gutterPart} { display: none; user-select: none; }`,
    `    .${ir.cssPrefix}__${transform.gutterPart}::before { content: attr(data-line); }`,
    `    :host([show-line-numbers]) .${ir.cssPrefix}__${transform.gutterPart} { display: inline-block; min-width: 2ch; text-align: right; margin-right: ${slot(`${transform.gutterPart}.size.gap`)}; color: ${slot(`${transform.gutterPart}.color.number`)}; }`,
    `  \`;`,
    `  @property({ type: Number }) number = 1;`,
    `  @property({ type: String }) ending = "";`,
    `  @property({ type: Boolean, attribute: "show-line-numbers" }) showLineNumbers = false;`,
    `  override render() { return html\`<span class="${ir.cssPrefix}__${transform.linePart}"><span class="${ir.cssPrefix}__${transform.gutterPart}" data-line=\${this.number} aria-hidden="true"></span><slot></slot>\${this.ending}</span>\`; }`,
    `}`,
    `customElements.define('fsds-${ir.cssPrefix}-line', ${line}Element);`,
    ``,
    `export class ${token}Element extends LitElement {`,
    `  static override styles = css\``,
    tokenRules,
    `  \`;`,
    `  @property({ type: String, attribute: "data-token", reflect: true }) kind: ${kindName} = "plain";`,
    `  override render() { return html\`<span class="${ir.cssPrefix}__${transform.tokenPart}" data-token=\${this.kind}><slot></slot></span>\`; }`,
    `}`,
    `customElements.define('fsds-${ir.cssPrefix}-token', ${token}Element);`,
  ].join("\n");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function tokenKinds(ir: ComponentIR, transform: HighlightTransformIR): string {
  const { kindName } = highlightTokenTypes(ir, transform);
  const type = ir.definedTypes[kindName];
  if (type?.kind !== "union" || !type.values) throw new Error(`${ir.name}: highlight token kinds require a union`);
  return type.values.map((value) => JSON.stringify(value)).join(" | ");
}
