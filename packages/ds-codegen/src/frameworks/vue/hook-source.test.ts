import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { generateVueHookSource } from "./hook-source.js";

describe("generateVueHookSource — real corpus contracts", () => {
  it("returns null for behavior-less contracts", () => {
    for (const name of ["Button", "Progress", "Badge", "Text"]) {
      expect(generateVueHookSource(corpusIR(name)), name).toBeNull();
    }
  });

  it("emits compound context wiring for Tabs", () => {
    const source = generateVueHookSource(corpusIR("Tabs"));

    expect(source).toContain(
      `import { createCompoundContext, useControllableState } from "../../primitives/index.js";`,
    );
    expect(source).toContain(`export interface UseTabsOptions`);
    expect(source).toContain(`export interface UseTabsResult`);
  });

  it("emits compound context wiring for the Accordion disclosure", () => {
    const source = generateVueHookSource(corpusIR("Accordion"));

    expect(source).toContain(`createCompoundContext`);
    expect(source).toContain(`export interface UseAccordionOptions`);
  });

  it("emits anchor-toggle wiring for Select's open channel", () => {
    const source = generateVueHookSource(corpusIR("Select"));

    expect(source).toContain(`useAnchorToggle`);
    expect(source).toContain(`export interface UseSelectOptions`);
  });

  it("emits dismissal, focus-trap and scroll-lock wiring for Dialog", () => {
    const source = generateVueHookSource(corpusIR("Dialog"));

    expect(source).toContain(`useDismissal`);
    expect(source).toContain(`useFocusTrap`);
    expect(source).toContain(`useScrollLock`);
  });

  it("emits anchor-toggle wiring for Toast's auto-dismiss surface", () => {
    const source = generateVueHookSource(corpusIR("Toast"));

    expect(source).toContain(`useAnchorToggle`);
    expect(source).toContain(`export interface UseToastOptions`);
  });

  it("emits a plain composable for OTP", () => {
    const source = generateVueHookSource(corpusIR("OTP"));

    expect(source).toContain(
      `export function useOTP(options: UseOTPOptions = {}): UseOTPResult {`,
    );
  });
});

describe("CODEGEN-EMIT-LINT-HYGIENE-01: vue hook import hygiene", () => {
  it("Toast imports only what its types+hook text references (no ref, no useControllableState)", () => {
    const source = generateVueHookSource(corpusIR("Toast"));

    expect(source).toContain(`import { type Ref } from "vue";`);
    expect(source).toContain(
      `import { useAnchorToggle } from "../../primitives/index.js";`,
    );
    expect(source).not.toContain("useControllableState");
  });

  it("Command's hook never references ref( so it must not import ref", () => {
    const source = generateVueHookSource(corpusIR("Command"));

    expect(source).toContain(`import { type Ref } from "vue";`);
    expect(source).not.toMatch(/import \{[^}]*\bref\b[^}]*\} from "vue";/);
  });

  it("Tabs keeps the full compound import set it actually uses", () => {
    const source = generateVueHookSource(corpusIR("Tabs"));

    expect(source).toContain(
      `import { createCompoundContext, useControllableState } from "../../primitives/index.js";`,
    );
  });
});
