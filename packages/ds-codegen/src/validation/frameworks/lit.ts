import type { FrameworkValidationPlan } from "../types.js";
import type { AdmissionDescriptor } from "../admission-descriptor.js";

/**
 * Lit admission rail (post CODEGEN-RAIL-LIT-TEMPLATE-ADMISSION-01).
 *
 * Two commands, each attributed to a distinct check:
 *
 * 1. `typecheck` (raw tsc) — proves the generated `.ts` files
 *    type-check as plain TypeScript modules.
 *
 * 2. `templateTypecheck` (lit-analyzer) — proves the generated
 *    lit-html `html\`...\`` template literals parse against
 *    lit-analyzer's HTML data model, with all enabled rules
 *    except the one declared rule narrowing.
 *
 * Declared rule narrowing: `no-incompatible-type-binding` is
 * disabled. Rationale: lit-analyzer's HTML data model requires
 * literal-union compatibility for several DOM attributes where
 * the design-system contracts intentionally expose broader
 * `string` APIs (e.g. `<input type=${this.type}>` where the
 * contract keeps `type?: string` to preserve HTML/future/custom
 * value compatibility, and channel-bound `aria-expanded` where
 * the IR-derived channel value type is broader than the strict
 * ARIA literal-union slot). This is a declared analyzer-policy
 * boundary, NOT defect masking — the runtime is type-correct
 * under the package TypeScript pass, and lit-analyzer continues
 * to exercise every other rule (template syntax, decorator
 * metadata, missing imports, nullable/undefined leakage, invalid
 * bindings not caused by this contract-policy mismatch, ...).
 */
export const litValidationPlan: FrameworkValidationPlan = {
  framework: "lit",
  commands: [
    {
      check: "typecheck",
      command: ["pnpm", "--filter", "@full-stack-ds/lit", "run", "typecheck"],
      scope: {
        packageRoot: "packages/ds-lit/",
        extensions: [".ts"],
        coverage: "covered_by_package_check",
      },
    },
    {
      check: "templateTypecheck",
      command: [
        "pnpm",
        "--filter",
        "@full-stack-ds/lit",
        "run",
        "typecheck:templates",
      ],
      // Mirrors the `typecheck:templates` script glob:
      // `lit-analyzer 'src/components/**/*.ts' --rules.no-incompatible-type-binding off`
      // — restricted to src/components, excluding tests.
      scope: {
        packageRoot: "packages/ds-lit/src/components/",
        extensions: [".ts"],
        excludePathSubstrings: ["/__tests__/", ".test.ts", ".spec.ts"],
        coverage: "covered_by_direct_template_check",
      },
      knownRuleNarrowings: ["no-incompatible-type-binding"],
    },
    {
      check: "lint",
      command: ["pnpm", "exec", "eslint", "packages/ds-lit/src", "--max-warnings=0"],
      // Root flat config lints the generated .ts sources including
      // __tests__ (re-included via negated ignores). Zero findings
      // required; findings are emitter bugs.
      scope: {
        packageRoot: "packages/ds-lit/",
        extensions: [".ts"],
        coverage: "covered_by_package_check",
      },
    },
  ],
  checks: {
    typecheck: "direct",
    lint: "direct",
    parse: "covered_by_typecheck",
    templateTypecheck: "direct",
  },
  knownGaps: [
    "Declared analyzer-policy boundary (NOT a generated-output defect, NOT a binding-site type escape): the lit-analyzer rule `no-incompatible-type-binding` is disabled in the `typecheck:templates` script. lit-analyzer's literal-union strictness for several DOM attribute slots is narrower than the design-system contract type policy (e.g. `<input type=${this.type}>` against contract `type?: string`). Whether contract props should gain stricter per-attribute literal-union typing is a separate contract-policy slice because it affects all framework emitters and public APIs.",
    "Declared lint-policy boundary: `@typescript-eslint/no-this-alias` is off for packages/ds-lit/src in the root eslint config. The emitter's behavior-wiring closes over the host via `const host = this;` because object-literal option getters cannot use arrow `this` — the alias is the idiomatic Lit pattern, not a defect. Same boundary class as the lit-analyzer narrowing above.",
  ],
};

/** Lit's self-declared rail admission facts (authored beside the plan). */
export const litAdmissionDescriptor: AdmissionDescriptor = {
  id: "lit",
  outputTreeRelPath: "packages/ds-lit/src/components",
  sourceExtensions: [".ts"],
  plan: litValidationPlan,
  reportRank: 3,
};
