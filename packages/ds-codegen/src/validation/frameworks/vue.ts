import type { FrameworkValidationPlan } from "../types.js";
import type { AdmissionDescriptor } from "../admission-descriptor.js";

export const vueValidationPlan: FrameworkValidationPlan = {
  framework: "vue",
  commands: [
    {
      check: "typecheck",
      command: ["pnpm", "--filter", "@full-stack-ds/vue", "run", "typecheck"],
      // vue-tsc parses .vue SFCs in addition to .ts/.tsx, so the
      // scope's extension filter covers all three. Coverage stays
      // `covered_by_package_check` — vue-tsc runs at the package
      // level via the package tsconfig.
      scope: {
        packageRoot: "packages/ds-vue/",
        extensions: [".ts", ".tsx", ".vue"],
        coverage: "covered_by_package_check",
      },
    },
    {
      check: "lint",
      command: ["pnpm", "exec", "eslint", "packages/ds-vue/src", "--max-warnings=0"],
      // Root flat config lints the generated .ts/.tsx sources
      // including __tests__ (re-included via negated ignores).
      // react/react-hooks rules do NOT apply here — the config
      // scopes them to the React family because Vue composables
      // deliberately mirror the `use*` API. Zero findings
      // required; findings are emitter bugs.
      scope: {
        packageRoot: "packages/ds-vue/",
        extensions: [".ts", ".tsx"],
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
    "Lint covers .ts/.tsx only: the root flat config has no .vue parser, so SFC script blocks are linted by neither this check nor any per-package toolchain yet. SFC admission rests on vue-tsc. Closing this needs an eslint-plugin-vue lane (follow-up slice).",
  ],
};

/** Vue's self-declared rail admission facts (authored beside the plan). */
export const vueAdmissionDescriptor: AdmissionDescriptor = {
  id: "vue",
  outputTreeRelPath: "packages/ds-vue/src/components",
  sourceExtensions: [".vue", ".ts", ".tsx"],
  plan: vueValidationPlan,
  reportRank: 1,
};
