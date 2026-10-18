import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { generateSvelteHookSource } from "./hook-source.js";

describe("generateSvelteHookSource — real corpus contracts", () => {
  it("returns null for behavior-less contracts", () => {
    for (const name of ["Button", "Progress", "Badge", "Text"]) {
      expect(generateSvelteHookSource(corpusIR(name)), name).toBeNull();
    }
  });

  it("emits compound context wiring for Tabs", () => {
    const source = generateSvelteHookSource(corpusIR("Tabs"));

    expect(source).toContain(
      `import { createCompoundContext, createControllableState } from "../../primitives/index.js";`,
    );
    expect(source).toContain(`export interface UseTabsOptions`);
    expect(source).toContain(`export interface UseTabsResult`);
  });

  it("emits compound context wiring for the Accordion disclosure", () => {
    const source = generateSvelteHookSource(corpusIR("Accordion"));

    expect(source).toContain(`createCompoundContext`);
    expect(source).toContain(`export interface UseAccordionOptions`);
  });

  it("emits anchor-toggle wiring for Select's open channel", () => {
    const source = generateSvelteHookSource(corpusIR("Select"));

    expect(source).toContain(`createAnchorToggle`);
    expect(source).toContain(`export interface UseSelectOptions`);
  });

  it("emits dismissal, focus-trap and scroll-lock wiring for Dialog", () => {
    const source = generateSvelteHookSource(corpusIR("Dialog"));

    expect(source).toContain(`createDismissal`);
    expect(source).toContain(`createFocusTrap`);
    expect(source).toContain(`createScrollLock`);
  });

  it("emits anchor-toggle wiring for Toast's auto-dismiss surface", () => {
    const source = generateSvelteHookSource(corpusIR("Toast"));

    expect(source).toContain(`createAnchorToggle`);
    expect(source).toContain(`export interface UseToastOptions`);
  });

  it("emits a plain composable for OTP", () => {
    const source = generateSvelteHookSource(corpusIR("OTP"));

    expect(source).toContain(
      `export function useOTP(opts: UseOTPOptions = {}): UseOTPResult {`,
    );
  });
});

describe("CODEGEN-EMIT-LINT-HYGIENE-01: svelte hook import hygiene", () => {
  it("Toast imports only createAnchorToggle — createControllableState is never referenced", () => {
    const source = generateSvelteHookSource(corpusIR("Toast"));

    expect(source).toContain(
      `import { createAnchorToggle } from "../../primitives/index.js";`,
    );
    expect(source).not.toContain("createControllableState");
  });

  it("Tabs keeps the full compound import set it actually uses", () => {
    const source = generateSvelteHookSource(corpusIR("Tabs"));

    expect(source).toContain(
      `import { createCompoundContext, createControllableState } from "../../primitives/index.js";`,
    );
  });
});
