import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import {
  generateAngularComponentSource,
  generateAngularCompoundStateParts,
  generateAngularDisclosureStateParts,
} from "./component-source.js";
import { generateAngularTest } from "./tests.js";
import { generateAngularSurfaceTest } from "./surface-tests.js";
import { generateAngularSurfaceFiles } from "./surface-emit.js";

/**
 * CODEGEN-EMIT-LINT-HYGIENE-01 — conditional import emission.
 *
 * Doctrine under test: an emitted import specifier must be referenced by
 * the emitted body. The Angular emitters assemble the body first and
 * derive the specifier set from what that body actually references, so a
 * component without behavior wiring must not import `inject`/`DestroyRef`,
 * a body without a derived signal must not import `computed`, and a test
 * body without `jest.fn()` spies must not import `jest`.
 *
 * Pins are exact-line: the specifier ORDER is part of the contract (the
 * canonical order the previous fixed lists used), so a regression to an
 * unconditional list — or a reorder — fails the pin.
 */

/** Every `import { ... } from "<module>";` statement in an emitted file. */
function importStatements(
  source: string,
): Array<{ module: string; specifiers: string[] }> {
  const out: Array<{ module: string; specifiers: string[] }> = [];
  for (const match of source.matchAll(
    /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*"([^"]+)";/g,
  )) {
    const specifiers = match[1]
      .split(",")
      .map((piece) => piece.trim().replace(/^type\s+/, ""))
      .filter((piece) => piece.length > 0);
    out.push({ module: match[2], specifiers });
  }
  return out;
}

/**
 * The file body with its own import statements and full-line comments
 * removed. Comment prose is not a reference for unused-import semantics
 * (eslint counts code uses, not comments — e.g. the emitted "// Signal
 * mirrors of @Input values" comment must not demand a `Signal` import),
 * so the oracle ignores full-line comments the way the lint rule does.
 */
function bodyWithoutImports(source: string): string {
  return source
    .replace(/import\s+(?:type\s+)?\{[^}]*\}\s*from\s*"[^"]+";/g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

function references(body: string, identifier: string): boolean {
  return new RegExp(`\\b${identifier}\\b`).test(body);
}

/**
 * @angular/core symbols any Angular emitter may import. The completeness
 * oracle uses this universe: a body that references one of them must have
 * it in the import line, or the emitted file does not compile.
 */
const ANGULAR_CORE_UNIVERSE = [
  "Component",
  "Directive",
  "Input",
  "OnChanges",
  "OnInit",
  "OnDestroy",
  "AfterContentInit",
  "AfterViewInit",
  "DoCheck",
  "SimpleChanges",
  "ElementRef",
  "ViewChild",
  "HostBinding",
  "computed",
  "signal",
  "effect",
  "forwardRef",
  "inject",
  "Injector",
  "runInInjectionContext",
  "untracked",
  "DestroyRef",
  "ChangeDetectionStrategy",
  "InjectionToken",
  "Signal",
  "WritableSignal",
] as const;

/**
 * The two-directional invariant, re-derived independently of the emitter's
 * own `usedSpecifiers` so a regression in either direction fails:
 *   1. no specifier is imported that the body never references
 *      (the `no-unused-vars` defect class), and
 *   2. no universe symbol referenced by the body is missing from the
 *      import (the compile-error defect class).
 */
function expectAngularCoreImportsMatchBody(label: string, source: string): void {
  const statement = importStatements(source).find(
    (entry) => entry.module === "@angular/core",
  );
  const body = bodyWithoutImports(source);
  expect(statement, `${label}: @angular/core import line present`).toBeDefined();
  for (const specifier of statement!.specifiers) {
    expect(
      references(body, specifier),
      `${label}: imported specifier "${specifier}" is referenced by the body`,
    ).toBe(true);
  }
  const referenced = ANGULAR_CORE_UNIVERSE.filter((symbol) =>
    references(body, symbol),
  );
  for (const symbol of referenced) {
    expect(
      statement!.specifiers.includes(symbol),
      `${label}: body-referenced symbol "${symbol}" is imported`,
    ).toBe(true);
  }
}

function coreImportLine(source: string): string {
  return (
    source.split("\n").find((line) => line.includes('} from "@angular/core";')) ??
    "(missing @angular/core import)"
  );
}

function jestImportLine(source: string): string {
  return (
    source.split("\n").find((line) => line.includes('} from "@jest/globals";')) ??
    "(missing @jest/globals import)"
  );
}

describe("CODEGEN-EMIT-LINT-HYGIENE-01: Angular component import sets derive from the body", () => {
  it("a dom-tree component without behavior wiring imports neither inject, DestroyRef, nor computed", () => {
    const source = generateAngularComponentSource(corpusIR("Alert"));
    expect(coreImportLine(source)).toBe(
      `import { Component, Input, ChangeDetectionStrategy } from "@angular/core";`,
    );
    // Falsification of the previous unconditional shape.
    expect(source).not.toContain("computed, DestroyRef, inject");
  });

  it("a behavior-wired component keeps every specifier its body references, in canonical order", () => {
    const source = generateAngularComponentSource(corpusIR("Dialog"));
    // CODEGEN-EMIT-LINT-HYGIENE-01: lifecycle interfaces are type-only
    // references (implements clauses) — inline `type` markers.
    expect(coreImportLine(source)).toBe(
      `import { Component, Input, DestroyRef, inject, ChangeDetectionStrategy, signal, ViewChild, ElementRef, Injector, runInInjectionContext, untracked, type OnInit, type OnDestroy } from "@angular/core";`,
    );
  });

  it("the auto-dismiss surface keeps effect (Toast) while a plain surface never imports it", () => {
    const toast = generateAngularComponentSource(corpusIR("Toast"));
    expect(coreImportLine(toast)).toContain("effect");
    const alert = generateAngularComponentSource(corpusIR("Alert"));
    expect(coreImportLine(alert)).not.toContain("effect");
  });

  it("TabsTab drops inject/DestroyRef (its body registers through the context hook)", () => {
    const parts = generateAngularCompoundStateParts(corpusIR("Tabs"));
    const tab = parts.find((part) => part.name === "TabsTab")!;
    expect(tab).toBeDefined();
    // CODEGEN-EMIT-LINT-HYGIENE-01: lifecycle interfaces are type-only
    // references (implements clauses) — inline `type` markers.
    expect(coreImportLine(tab.content)).toBe(
      `import { Component, Input, type OnInit, type OnDestroy, computed, ChangeDetectionStrategy } from "@angular/core";`,
    );
  });

  it("TabsPanel drops inject (its body reads the context hook directly)", () => {
    const parts = generateAngularCompoundStateParts(corpusIR("Tabs"));
    const panel = parts.find((part) => part.name === "TabsPanel")!;
    expect(panel).toBeDefined();
    expect(coreImportLine(panel.content)).toBe(
      `import { Component, Input, computed, ChangeDetectionStrategy } from "@angular/core";`,
    );
  });

  it("TabsList keeps ElementRef+inject (its keydown handler queries the host)", () => {
    const parts = generateAngularCompoundStateParts(corpusIR("Tabs"));
    const list = parts.find((part) => part.name === "TabsList")!;
    expect(list).toBeDefined();
    expect(coreImportLine(list.content)).toBe(
      `import { Component, Input, ElementRef, inject, ChangeDetectionStrategy } from "@angular/core";`,
    );
  });

  it("Accordion disclosure parts keep exactly what their bodies use", () => {
    const parts = generateAngularDisclosureStateParts(corpusIR("Accordion"));
    const item = parts.find((part) => part.name === "AccordionItem")!;
    const trigger = parts.find((part) => part.name === "AccordionTrigger")!;
    expect(coreImportLine(item.content)).toBe(
      `import { Component, Input, ChangeDetectionStrategy } from "@angular/core";`,
    );
    expect(coreImportLine(trigger.content)).toBe(
      `import { Component, Input, computed, ChangeDetectionStrategy } from "@angular/core";`,
    );
  });

  it("the meta-invariant holds for a representative corpus slice (no unused, none missing)", () => {
    for (const name of [
      "Alert",
      "Avatar",
      "Button",
      "Dialog",
      "Toast",
      "Select",
      "OTP",
      "Walkthrough",
      "Icon",
      "Tabs",
      "Accordion",
    ]) {
      const ir = corpusIR(name);
      expectAngularCoreImportsMatchBody(
        `${name}.component`,
        generateAngularComponentSource(ir),
      );
      for (const part of generateAngularCompoundStateParts(ir)) {
        expectAngularCoreImportsMatchBody(`${part.name}.component`, part.content);
      }
      for (const part of generateAngularDisclosureStateParts(ir)) {
        expectAngularCoreImportsMatchBody(`${part.name}.component`, part.content);
      }
    }
  });

  it("the meta-invariant holds for the anchored-surface family (root, directive, trigger, content, composable)", () => {
    for (const name of ["Tooltip", "Popover"]) {
      const files = generateAngularSurfaceFiles(corpusIR(name));
      expectAngularCoreImportsMatchBody(`${name}.component`, files.rootComponent);
      expectAngularCoreImportsMatchBody(`${name}Trigger.directive`, files.triggerDirective);
      expectAngularCoreImportsMatchBody(`${name}Trigger.component`, files.triggerComponent);
      expectAngularCoreImportsMatchBody(`${name}Content.component`, files.contentComponent);
      expectAngularCoreImportsMatchBody(`${name} composable`, files.composable);
    }
  });
});

describe("CODEGEN-EMIT-LINT-HYGIENE-01: emitted test suites import only the jest APIs they use", () => {
  it("a dom-tree suite without dismissal tests imports beforeEach but not jest", () => {
    const source = generateAngularTest(corpusIR("Alert"));
    expect(jestImportLine(source)).toBe(
      `import { describe, expect, it, beforeEach } from "@jest/globals";`,
    );
    // Falsification of the previous unconditional shape: the emitted body
    // has no jest use site (the raw source does contain "@jest/globals").
    expect(source).not.toContain("jest.fn");
    expect(bodyWithoutImports(source)).not.toMatch(/\bjest\./);
  });

  it("a dismissal suite keeps jest for its jest.fn() spies", () => {
    const source = generateAngularTest(corpusIR("Dialog"));
    expect(jestImportLine(source)).toBe(
      `import { describe, expect, it, beforeEach, jest } from "@jest/globals";`,
    );
    expect(source).toContain("jest.fn()");
  });

  it("a stack-only suite (Card, no dom tree) keeps the bare three-specifier line", () => {
    const source = generateAngularTest(corpusIR("Card"));
    expect(jestImportLine(source)).toBe(
      `import { describe, expect, it } from "@jest/globals";`,
    );
  });

  it("the anchored-surface suites use all five jest globals, so all five stay", () => {
    const expected = `import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";`;
    expect(jestImportLine(generateAngularSurfaceTest(corpusIR("Tooltip")))).toBe(expected);
    expect(jestImportLine(generateAngularSurfaceTest(corpusIR("Popover")))).toBe(expected);
  });

  it("every emitted jest-globals specifier is referenced at a call/member site in the emitted body", () => {
    const usePatterns: ReadonlyArray<readonly [string, RegExp]> = [
      ["describe", /\bdescribe\(/],
      ["expect", /\bexpect\(/],
      ["it", /\bit\(/],
      ["beforeEach", /\bbeforeEach\(/],
      ["afterEach", /\bafterEach\(/],
      ["jest", /\bjest\./],
    ];
    const suites: Array<[string, string]> = [
      ...["Alert", "Avatar", "Button", "Dialog", "Toast", "Select", "OTP", "Walkthrough", "Tabs", "Accordion", "Icon"].map(
        (name): [string, string] => [
          `${name}.test`,
          generateAngularTest(corpusIR(name)),
        ],
      ),
      ...["Tooltip", "Popover"].map(
        (name): [string, string] => [
          `${name} surface test`,
          generateAngularSurfaceTest(corpusIR(name)),
        ],
      ),
    ];
    for (const [label, source] of suites) {
      const statement = importStatements(source).find(
        (entry) => entry.module === "@jest/globals",
      );
      expect(statement, `${label}: @jest/globals import present`).toBeDefined();
      for (const specifier of statement!.specifiers) {
        const pattern = usePatterns.find(([name]) => name === specifier)![1];
        expect(
          pattern.test(bodyWithoutImports(source)),
          `${label}: imported "${specifier}" is used by the emitted body`,
        ).toBe(true);
      }
    }
  });
});
