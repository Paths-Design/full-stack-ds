import { defineConfig } from "vitest/config";

// Dedicated runner for the examples data/API seam tests. The root
// `vitest.config.ts` include covers only `packages/**` and `src/**`, so it
// never collects `examples/**`. This config exists so those data/API suites
// run through one committed command (`pnpm run test:examples:data-api`)
// instead of an ad-hoc scratch config.
//
// Scope and non-claims:
// - Node environment only. These are pure fixture -> adapter -> typed-promise
//   API tests (plus the motion-lab token adapter) with no DOM, so no jsdom,
//   no React plugin, and no setup file.
// - The include list is exactly the three example data/API src trees plus the
//   motion-lab shared src tree. It does not pick up framework lane files
//   (`examples/*/{react,vue,svelte,angular,lit,web}`) or any generated package.
// - This proves the data/API seam and the motion token adapter, not framework
//   app parity, not visual fidelity, not a real backend, and not
//   generated-artifact admission.
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "examples/operations-dashboard/src/**/*.{test,spec}.ts",
      "examples/storefront-checkout/src/**/*.{test,spec}.ts",
      "examples/social-feed/src/**/*.{test,spec}.ts",
      "examples/motion-lab/src/**/*.{test,spec}.ts",
    ],
  },
});
