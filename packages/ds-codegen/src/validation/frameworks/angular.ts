import type { FrameworkValidationPlan } from "../types.js";
import type { AdmissionDescriptor } from "../admission-descriptor.js";

/**
 * Angular admission rail (post CODEGEN-RAIL-ANGULAR-NGTSC-01).
 *
 * Two commands, each attributed to a distinct check:
 *
 * 1. `typecheck` (raw tsc) — proves the generated `.component.ts`
 *    files type-check as plain TypeScript modules. Covers IR-level
 *    type errors, @Input typing, signal usage, etc.
 *
 * 2. `templateTypecheck` (ngc with strictTemplates) — proves the
 *    generated @Component template strings parse and type-check
 *    against the Angular compiler's view of HTMLElement types and
 *    standalone-component imports. Catches NG8002 (binding to
 *    read-only IDL like <label>.form), NG8113 (unused standalone
 *    imports), NG6004 (missing standalone imports), etc.
 *
 * Both run unconditionally; a failure in one does NOT short-circuit
 * the other, so a single rail invocation surfaces the full
 * admission picture.
 *
 * Manifest×command scope authority
 * (CODEGEN-RAIL-ARTIFACT-MANIFEST-ADMISSION-01):
 *   - `typecheck` (tsc) sees `src/**` of `packages/ds-angular/`,
 *     including tests. `.ts` only — Angular emits no `.tsx`.
 *   - `templateTypecheck` (ngc) uses `tsconfig.ngc.json` which
 *     excludes `src/**\/__tests__/**` and `*.spec.ts`/`*.test.ts`.
 *     The join treats tests as `not_selected` for this command
 *     (they ARE covered by the raw `typecheck` command).
 */
export const angularValidationPlan: FrameworkValidationPlan = {
  framework: "angular",
  commands: [
    {
      check: "typecheck",
      command: [
        "pnpm",
        "--filter",
        "@full-stack-ds/angular",
        "run",
        "typecheck",
      ],
      scope: {
        packageRoot: "packages/ds-angular/",
        extensions: [".ts"],
        coverage: "covered_by_package_check",
      },
    },
    {
      check: "templateTypecheck",
      command: [
        "pnpm",
        "--filter",
        "@full-stack-ds/angular",
        "run",
        "typecheck:ngc",
      ],
      scope: {
        packageRoot: "packages/ds-angular/",
        extensions: [".ts"],
        // Mirrors `tsconfig.ngc.json` exclude.
        excludePathSubstrings: ["/__tests__/", ".test.ts", ".spec.ts"],
        coverage: "covered_by_direct_template_check",
      },
    },
    {
      check: "lint",
      command: [
        "pnpm",
        "exec",
        "eslint",
        "packages/ds-angular/src",
        "--max-warnings=0",
      ],
      // Root flat config lints the generated .ts sources including
      // __tests__ (re-included via negated ignores) and the
      // src/preview host pipeline. react/react-hooks rules do NOT
      // apply here — the config scopes them to the React family,
      // because Angular components deliberately call the mirrored
      // `use*` behavior controllers. Zero findings required;
      // findings are emitter bugs (e.g. unconditional import
      // specifiers the class body never references).
      scope: {
        packageRoot: "packages/ds-angular/",
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
};

/** Angular's self-declared rail admission facts (authored beside the plan). */
export const angularAdmissionDescriptor: AdmissionDescriptor = {
  id: "angular",
  outputTreeRelPath: "packages/ds-angular/src/components",
  sourceExtensions: [".ts"],
  plan: angularValidationPlan,
  reportRank: 4,
};
