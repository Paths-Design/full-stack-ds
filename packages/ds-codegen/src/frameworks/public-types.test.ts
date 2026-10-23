import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { corpusIR } from "./corpus-fixtures.js";
import { generateVueBarrel } from "./vue/barrel.js";
import { generateSvelteBarrel } from "./svelte/barrel.js";
import { generateReactNativeBarrel } from "./react-native/barrel.js";
import { generateAngularBarrel } from "./angular/barrel.js";
import { generateLitBarrel } from "./lit/barrel.js";
import { generateSvelteComponentSource } from "./svelte/component-source.js";
import { generateSvelteSurfaceFiles } from "./svelte/surface-emit.js";
import { sveltePublicTypeAliases } from "./svelte/public-types.js";

describe("public framework type exports", () => {
  it.each([
    ["vue", generateVueBarrel],
    ["svelte", generateSvelteBarrel],
  ] as const)("preserves %s runtime identity when a part shares a data type name", (extension, generate) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fsds-public-collision-"));
    try {
      fs.mkdirSync(path.join(directory, "Widget"));
      const moduleAttribute = extension === "svelte" ? " module" : "";
      fs.writeFileSync(path.join(directory, `Widget/Widget.${extension}`), `<script${moduleAttribute} lang="ts">export type WidgetItem = { value: string };</script>`);
      fs.writeFileSync(path.join(directory, `Widget/WidgetItem.${extension}`), '<script lang="ts">const privateState = true;</script>');
      const source = generate(["Widget"], directory);
      expect(source).toContain(`export type WidgetItem = import("./Widget/Widget.${extension}").WidgetItem;`);
      expect(source).toContain(`export const WidgetItem: typeof import("./Widget/WidgetItem.${extension}").default = __FsdsWidgetItem;`);
      const root = {};
      const part = {};
      const exports: Record<string, unknown> = {};
      const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
      const require = (specifier: string) => ({ __esModule: true, default: specifier === `./Widget/WidgetItem.${extension}` ? part : root });
      new Function("require", "exports", emitted.outputText)(require, exports);
      expect(exports.Widget).toBe(root);
      expect(exports.WidgetItem).toBe(part);
      fs.writeFileSync(path.join(directory, `Widget/WidgetItem.${extension}`), `<script${moduleAttribute} lang="ts">export type WidgetItem = number;</script>`);
      expect(() => generate(["Widget"], directory)).toThrow(/Ambiguous public type WidgetItem/);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
  it("derives Vue props from the actual component and carries named types", () => {
    const source = generateVueBarrel(["Button"]);
    expect(source).toContain('export type * from "./Button/Button.vue";');
    expect(source).toContain('export type ButtonProps = InstanceType<typeof import("./Button/Button.vue").default>["$props"];');
  });
  it("derives Svelte props from the actual component and carries named types", () => {
    const source = generateSvelteBarrel(["Button"]);
    expect(source).toContain('export type * from "./Button/Button.svelte";');
    expect(source).toContain('export type ButtonProps = import("svelte").ComponentProps<typeof import("./Button/Button.svelte").default>;');
  });
  it("exports aliases without creating class-based props wrappers", () => {
    expect(generateReactNativeBarrel(["Button"])).toContain('export type * from "./Button/Button";');
    const angular = generateAngularBarrel(["Button"]);
    const lit = generateLitBarrel(["Button"]);
    expect(angular).toContain('export type * from "./Button/Button.component.js";');
    expect(lit).toContain('export type * from "./Button/Button.js";');
    expect(angular).not.toContain("ButtonProps");
    expect(lit).not.toContain("ButtonProps");
  });
  it("exports data aliases once in module scope", () => {
    const source = generateSvelteComponentSource(corpusIR("Select"));
    const module = source.match(/<script module lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(module).toContain("export type SelectOption =");
    expect(module).toContain("export type SelectSize =");
    expect([...source.matchAll(/type SelectOption =/g)]).toHaveLength(1);
  });
  it("exports specialized aliases without hoisting instance counters", () => {
    const source = generateSvelteComponentSource(corpusIR("Accordion"));
    const module = source.match(/<script module lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(module).toContain("export type AccordionType =");
    expect(module).not.toContain("let _accordionIdCounter");
    expect(source).toContain("let _accordionIdCounter = 0;");
    const surface = generateSvelteSurfaceFiles(corpusIR("Tooltip")).rootSfc;
    const surfaceModule = surface.match(/<script module lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(surfaceModule).toContain("export type TooltipPlacement =");
  });
  it("retains transitive data-alias definitions in dependency order", () => {
    const original = corpusIR("Select");
    const ir = {
      ...original,
      styledProps: [{ ...original.styledProps[0]!, typeRefs: ["PublicOptions"] }],
      definedTypes: {
        PublicOptions: { kind: "alias", alias: "PublicOption[]" },
        PublicOption: { kind: "union", values: ["one", "two"] },
      },
    };
    expect(sveltePublicTypeAliases(ir)).toEqual([
      'export type PublicOption = "one" | "two";',
      'export type PublicOptions = PublicOption[];',
    ]);
  });
});
