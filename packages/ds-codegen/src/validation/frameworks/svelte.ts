import type { FrameworkValidationPlan } from "../types.js";
import type { AdmissionDescriptor } from "../admission-descriptor.js";

export const svelteValidationPlan: FrameworkValidationPlan = {
  framework: "svelte",
  commands: [
    {
      check: "typecheck",
      command: ["pnpm", "--filter", "@full-stack-ds/svelte", "run", "typecheck"],
      // svelte-check covers .svelte SFCs and .ts files in the
      // package. Coverage is `covered_by_package_check` — the
      // command runs at the package level via the package tsconfig
      // and the svelte-check default workspace scope.
      scope: {
        packageRoot: "packages/ds-svelte/",
        extensions: [".ts", ".svelte"],
        coverage: "covered_by_package_check",
      },
    },
    {
      check: "lint",
      command: [
        "pnpm",
        "exec",
        "eslint",
        "packages/ds-svelte/src",
        "--max-warnings=0",
      ],
      // Root flat config lints the generated .ts sources (incl.
      // .svelte.ts modules and __tests__; re-included via negated
      // ignores). react/react-hooks rules do NOT apply here — the
      // config scopes them to the React family. Zero findings
      // required; findings are emitter bugs.
      scope: {
        packageRoot: "packages/ds-svelte/",
        extensions: [".ts"],
        coverage: "covered_by_package_check",
      },
    },
  ],
  checks: {
    typecheck: "direct",
    lint: "direct",
    parse: "covered_by_typecheck",
    template: "covered_by_typecheck",
  },
  knownGaps: [
    "Lint covers .ts (incl. .svelte.ts modules) only: the root flat config has no .svelte parser, so SFC script blocks are linted by neither this check nor any per-package toolchain yet. SFC admission rests on svelte-check. Closing this needs an eslint-plugin-svelte lane (follow-up slice).",
  ],
};

/** Svelte's self-declared rail admission facts (authored beside the plan). */
export const svelteAdmissionDescriptor: AdmissionDescriptor = {
  id: "svelte",
  outputTreeRelPath: "packages/ds-svelte/src/components",
  sourceExtensions: [".svelte", ".ts"],
  plan: svelteValidationPlan,
  reportRank: 2,
};
