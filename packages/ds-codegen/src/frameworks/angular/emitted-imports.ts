/**
 * Import-set derivation for Angular emitters (CODEGEN-EMIT-LINT-HYGIENE-01).
 *
 * Doctrine: an emitted import specifier must be referenced by the emitted
 * body. Every emitter assembles its body first, then derives the specifier
 * set from what that body actually references — the same discipline as the
 * Lit emitter's `componentBody.includes("ifDefined(")` directive-import
 * gating. Candidate lists stay in each call site's canonical order, so a
 * body that references every candidate emits byte-identical output to the
 * previous fixed import lists; only unreferenced specifiers drop out.
 *
 * Both directions matter:
 *   - a specifier the body never references is a `no-unused-vars` finding;
 *   - a body reference with no specifier is a compile error. The scan is
 *     over the exact bytes the emitter is about to write, so it can neither
 *     over- nor under-shoot the body.
 */

/** Matches `identifier` as a standalone word (decorator, type, or call position). */
function referencesIdentifier(body: string, identifier: string): boolean {
  return new RegExp(
    `\\b${identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
  ).test(body);
}

/**
 * Angular `@angular/core` exports that are ALWAYS type-only in emitted
 * code — lifecycle interfaces and their change-signature type. Used at
 * fixed-template import sites that have no assembled body to scan.
 */
export const TYPE_ONLY_ANGULAR_CORE: ReadonlySet<string> = new Set([
  "OnInit",
  "OnDestroy",
  "OnChanges",
  "AfterViewInit",
  "AfterContentInit",
  "DoCheck",
  "SimpleChanges",
]);

/**
 * Filter an ordered candidate list down to the specifiers the body
 * references. Deterministic: output order always mirrors input order.
 */
export function usedSpecifiers<T extends string>(
  candidates: readonly T[],
  body: string,
): T[] {
  return candidates.filter((candidate) =>
    referencesIdentifier(body, candidate),
  );
}

/**
 * Type-aware specifier assembly (CODEGEN-EMIT-LINT-HYGIENE-01): a specifier
 * the body references ONLY in type positions (interfaces, parameter and
 * generic annotations) is imported with an inline `type` marker, satisfying
 * `@typescript-eslint/consistent-type-imports` the same way the hook
 * emitter's hand-written `{ DestroyRef, type Signal }` line already does.
 *
 * Value use is detected structurally, not by name list:
 *   - `@Name`   decorator position;
 *   - `Name(` / `Name.` call or enum-member position;
 *   - `(Name` / `, Name` followed by `)` `,` or `<` — argument position,
 *     including generic arguments (`inject(ElementRef<HTMLElement>)` uses
 *     ElementRef as a VALUE; `Signal<string>` is a type because Signal is
 *     never in an argument/call/decorator position).
 * A name used in both positions imports as a value (correct for both).
 */
export function typeAwareSpecifiers(
  candidates: readonly string[],
  body: string,
): string[] {
  return usedSpecifiers(candidates, body).map((name) => {
    const e = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const valueUsed =
      new RegExp(`@${e}\\b`).test(body) ||
      new RegExp(`\\b${e}[.(]`).test(body) ||
      // Generic call: `name<Args>(...)` — the call is a VALUE use even
      // though the name is followed by `<` (a bare `Signal<...>` type
      // annotation never has the trailing `(`).
      new RegExp(`\\b${e}<(?:[^<>]|<[^<>]*>)*>\\(`).test(body) ||
      new RegExp(`[(,]\\s*${e}\\s*[,)<]`).test(body);
    return valueUsed ? name : `type ${name}`;
  });
}

/**
 * Assemble the `@jest/globals` import line for an emitted test file from
 * what the emitted test body actually references. Each API is matched at
 * its use site — `describe(`/`expect(`/`it(`/`beforeEach(`/`afterEach(` as
 * calls, `jest.` as a member access — so comment prose cannot keep an
 * unused specifier alive (the emitted bodies mention "jest-preset-angular"
 * in comments; a bare word match on `jest` would false-positive on it, and
 * `it` is a common English word).
 */
export function jestGlobalsImportLine(testsBody: string): string {
  const apis: ReadonlyArray<readonly [string, RegExp]> = [
    ["describe", /\bdescribe\(/],
    ["expect", /\bexpect\(/],
    ["it", /\bit\(/],
    ["beforeEach", /\bbeforeEach\(/],
    ["afterEach", /\bafterEach\(/],
    ["jest", /\bjest\./],
  ];
  const used = apis
    .filter(([, usePattern]) => usePattern.test(testsBody))
    .map(([name]) => name);
  return `import { ${used.join(", ")} } from "@jest/globals";`;
}
