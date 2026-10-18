import type { FrameworkValidationPlan } from "../types.js";
import type { AdmissionDescriptor } from "../admission-descriptor.js";

export const reactNativeValidationPlan: FrameworkValidationPlan = {
  framework: "react-native",
  commands: [
    {
      check: "typecheck",
      command: ["pnpm", "--filter", "@full-stack-ds/react-native", "run", "typecheck"],
      scope: {
        packageRoot: "packages/ds-react-native/",
        extensions: [".ts", ".tsx", ".json"],
        coverage: "covered_by_package_check",
      },
    },
    {
      check: "runtime",
      command: ["pnpm", "--filter", "@full-stack-ds/react-native", "run", "test"],
      scope: {
        packageRoot: "packages/ds-react-native/",
        extensions: [".ts", ".tsx"],
        coverage: "covered_by_package_check",
      },
    },
    {
      check: "lint",
      command: [
        "pnpm",
        "exec",
        "eslint",
        "packages/ds-react-native/src",
        "--max-warnings=0",
      ],
      // Root flat config lints the generated src tree including
      // __tests__. Zero findings required — see the react plan's
      // lint note; the same emitter-hygiene contract holds here.
      scope: {
        packageRoot: "packages/ds-react-native/",
        extensions: [".ts", ".tsx"],
        coverage: "covered_by_package_check",
      },
    },
  ],
  checks: {
    typecheck: "direct",
    lint: "direct",
    runtime: "direct",
    parse: "covered_by_typecheck",
  },
  knownGaps: [
    "Runtime evidence is limited to generated React Native render tests (host-render archetypes, variant style realization, surface substrate); it does not prove simulator or device execution, native visual parity, or platform accessibility parity.",
    "Presence surfaces are admitted: Dialog/Sheet via Modal, Toast via live region with the dwell-token auto-dismiss timer, Tooltip/Popover via the anchored Modal substrate. Documented anchored divergences: outside content is inert while open, hover/focus open-triggers lower to long-press, pointer-leave dismissal lowers to backdrop press, and collision handling (flip/shift) is not implemented. Compound selection is admitted for Tabs (context+provider, press-driven selection, accessibilityState.selected): no keyboard navigation or roving tabindex on touch, a static indicator ornament, no orientation layout effect, and unmountInactive=false renders inactive panels mounted-but-suppressed rather than hidden. Walkthrough/coachmark and the disclosure family (Accordion) remain unadmitted.",
    "Part-scoped variant styling and boolean-modifier styling (e.g. Card --inset) are not yet realized natively.",
  ],
};

/** React Native's self-declared rail admission facts (authored beside the plan). */
export const reactNativeAdmissionDescriptor: AdmissionDescriptor = {
  id: "react-native",
  outputTreeRelPath: "packages/ds-react-native/src/components",
  sourceExtensions: [".tsx", ".ts"],
  plan: reactNativeValidationPlan,
  reportRank: 5,
};
