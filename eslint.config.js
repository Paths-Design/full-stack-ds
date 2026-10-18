// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/**
 * Flat ESLint configuration for the full-stack-ds monorepo.
 *
 * Scope decisions (updated by CODEGEN-EMIT-LINT-HYGIENE-01):
 *   - Lint TypeScript, TSX, and the small JS surface (eslint config, scripts).
 *   - Skip `dist/`, build outputs, lockfiles.
 *   - Skip `packages/ds-contracts/portfolio-original/` (untranslated upstream).
 *   - The six rail-admitted generated packages (ds-react, ds-react-native,
 *     ds-vue, ds-svelte, ds-angular, ds-lit) ARE linted, including their
 *     generated `__tests__` (re-included below via negated ignores). The
 *     emitters are responsible for producing lint-clean output; the root
 *     gate and the admission-rail `lint` checks hold that line.
 *   - `.vue` and `.svelte` SFCs are not linted here: this config has no
 *     parser for them, so directory traversal skips them by extension.
 *     SFC linting needs per-target toolchains (eslint-plugin-vue /
 *     eslint-plugin-svelte) — a declared known gap in each framework's
 *     validation plan, not a silent ignore.
 *   - Hand-authored test files outside the generated packages stay ignored
 *     so contract-driven authoring isn't penalized for stylistic choices;
 *     generated tests have no such excuse and are linted.
 *
 * Rule philosophy: focus on rules that catch real bugs (unused vars,
 * unreachable code, hooks misuse) rather than stylistic preferences. The
 * generated React code uses patterns (`as` casts for Booleanish coercion)
 * that are intentional and would be noisy to flag.
 *
 * React-family scoping: react / react-hooks rules apply ONLY to the
 * showcase app and the two React-family packages. The other targets
 * deliberately mirror the `use*` behavior-primitive API (Vue composables,
 * Angular controller calls), which the react-hooks rule misreads as hook
 * misuse — that is a rule-domain mismatch, not an emitted-code defect.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      // svelte-package staging output (build scratch under ds-svelte).
      "**/.svelte-kit/**",
      "**/.vite/**",
      "**/.vitest-cache/**",
      "**/coverage/**",
      "**/tmp/**",
      ".caws/**",
      // Installed CAWS agent-surface hooks: CommonJS by design (require() is
      // correct), marked do_not_edit_directly / maintained via `caws init`.
      // Not repo source — its own toolchain owns it, like the surfaces below.
      ".claude/**",
      // Codex agent-surface tooling: same rationale as .claude/** — CommonJS
      // by design (require() is correct), per-machine agent tooling, not repo
      // source. Untracked and gitignored; its own toolchain owns it.
      ".codex/**",
      "packages/ds-contracts/portfolio-original/**",
      "packages/ds-contracts/tokens/**",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      // Generated packages re-include their whole src tree — component
      // sources AND generated tests. Lint findings there are emitter bugs
      // (unused imports, dead guards, type-only imports) and get fixed in
      // the emitter, never suppressed here.
      "!packages/ds-react/src/**",
      "!packages/ds-react-native/src/**",
      "!packages/ds-vue/src/**",
      "!packages/ds-svelte/src/**",
      "!packages/ds-angular/src/**",
      "!packages/ds-lit/src/**",
      "e2e/**",
      "playwright-report/**",
      "test-results/**",
      "pnpm-lock.yaml",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // TypeScript handles unused-var detection more accurately than the JS
      // rule; mute the latter and configure the former.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // The generator emits `as "true" | "false"` casts and other narrow
      // assertions on purpose; flag truly any-typed lapses with a warning.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      // Prefer `import type` to keep emit clean — the emitters honor this;
      // a violation is a template bug, not stylistic noise.
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", disallowTypeAnnotations: false },
      ],
    },
  },
  {
    // React-family only: showcase app + ds-react + ds-react-native. The
    // remaining targets mirror the `use*` API on purpose (see header), so
    // react/react-hooks rules must not fire on them.
    files: [
      "src/**/*.{ts,tsx}",
      "packages/ds-react/src/**/*.{ts,tsx}",
      "packages/ds-react-native/src/**/*.{ts,tsx}",
    ],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // React hooks correctness — catches missing deps and bad hook order.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // JSX-specific niceties — keep on but lenient.
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/no-unknown-property": "error",
      // React 19+ no longer requires JSX-in-scope; modern JSX runtime handles it.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    // Lit policy boundary (declared, mirroring the lit-analyzer boundary in
    // packages/ds-codegen/src/validation/frameworks/lit.ts): the Lit emitter
    // closes over the host via `const host = this;` inside the behavior
    // getter — object-literal option getters cannot use arrow `this`, so the
    // alias is the idiomatic Lit pattern, not a defect. The rail's lit plan
    // carries the same boundary as a known gap.
    files: ["packages/ds-lit/src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-this-alias": "off",
    },
  },
  {
    // CommonJS config files (jest configs, setups) — `require()` is the
    // correct module system there by design; the ESM rule must not fire.
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
