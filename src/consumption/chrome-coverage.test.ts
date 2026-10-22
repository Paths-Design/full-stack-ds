/**
 * Chrome coverage ratchet (SHOWCASE-CHROME-T1-01).
 *
 * The showcase must statically consume the DS families it has adopted as real
 * app chrome. This test derives the family set from the generated package
 * (readdir — self-maintaining as the corpus grows) and asserts every family in
 * the adopted tier appears as a NAMED static import in src/'s chrome files.
 *
 * What does NOT count as chrome adoption:
 *   - `import * as DS` namespace rendering (DisplayCaseView, usage-registry,
 *     render-usage) — those are exhibit surfaces that render components as
 *     catalog samples, not the app building itself with them.
 *   - test files.
 *
 * PENDING (tier 2 — phase 3 surfaces: Settings/Activity/About/tour):
 *   Avatar, Calendar, CodeBlock, Command, Dialog, Field, Image, Markdown, OTP,
 *   Postcard, ProfileFlag, Sheet, Shuttle, TextField, ToggleSwitch, Walkthrough.
 * Field waits for phase 3's Settings form, where it pairs with Input (the
 * control that consumes its association context); Select does not consume it.
 * Text is blocked by an emitter gap: the contract declares a `children` slot
 * but the emitted React TextProps omits it, so JSX children are type-illegal.
 * Track in residual backlog; adopt once the emitter declares it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const SRC = resolve(HERE, "..");
const COMPONENTS_DIR = resolve(REPO, "packages/ds-react/src/components");

/**
 * Families exempt from the full-corpus requirement, each with its blocker.
 * Text and Command share one emitter-composition gap: the contract declares a
 * `children` slot the emitted React component drops, so consumer content
 * cannot compose into the root. Adopt immediately when the emitter forwards
 * what the contract declares (residual backlog).
 *   Text:    TextProps omits `children` — JSX content is type-illegal.
 *   Command: root renders internal scaffold only; consumer children are
 *            never forwarded, so palette entries cannot compose.
 *   Shuttle: no emitter gap remains (its options prop and value channel
 *            drive a full transfer); SettingsView's nav-group picker, the
 *            consumer prefs.ts names, still uses checkboxes, and swapping
 *            it is a product decision.
 */
export const BLOCKED_FAMILIES = ["Command", "Shuttle", "Text"] as const;

const EXHIBIT_FILES = /(DisplayCaseView|usage-registry|render-usage)/;

function collectChromeSources(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      collectChromeSources(full, acc);
    } else if (/\.(tsx|ts)$/.test(entry) && !/\.(test|spec)\.[jt]sx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const chromeSources = collectChromeSources(SRC)
  .filter((f) => !EXHIBIT_FILES.test(f))
  .map((f) => ({ file: f, src: readFileSync(f, "utf8") }));

function staticallyImports(family: string): string[] {
  const re = new RegExp(
    `import\\s*\\{[^}]*\\b${family}\\b[^}]*\\}\\s*from\\s*["@']@full-stack-ds/react["']`,
  );
  return chromeSources.filter((f) => re.test(f.src)).map((f) => f.file);
}

describe("chrome coverage ratchet (SHOWCASE-CHROME-T1-01/T2-01)", () => {
  it("every corpus family except the documented blockers is statically imported by real chrome files", () => {
    const corpus = readdirSync(COMPONENTS_DIR).filter((d) => d !== "index.ts");
    const required = corpus.filter((fam) => !(BLOCKED_FAMILIES as readonly string[]).includes(fam));
    const missing = required.filter((fam) => staticallyImports(fam).length === 0);
    expect(
      missing,
      `families that lost their static chrome import: ${missing.join(", ")} — either adopt them as real chrome or add them to BLOCKED_FAMILIES with a blocker`,
    ).toEqual([]);
  });

  it("blocked families cite real corpus names (no phantom exemptions)", () => {
    const corpus = new Set(
      readdirSync(COMPONENTS_DIR).filter((d) => d !== "index.ts"),
    );
    const phantoms = BLOCKED_FAMILIES.filter((fam) => !corpus.has(fam));
    expect(
      phantoms,
      `BLOCKED_FAMILIES names that no longer exist in the corpus (update this list): ${phantoms.join(", ")}`,
    ).toEqual([]);
  });

  it("negative control: the import detector actually bites", () => {
    // Real corpus detection works…
    expect(staticallyImports("Accordion").length).toBeGreaterThan(0);
    // …and the blocked families genuinely have no static import today.
    for (const fam of BLOCKED_FAMILIES) {
      expect(staticallyImports(fam), `${fam} is blocked — it must not be imported`).toEqual([]);
    }
    // …and an unknown family resolves to zero adopters rather than erroring.
    expect(staticallyImports("NoSuchFamily")).toEqual([]);
    // A family rendered only through an exhibit namespace import is NOT a
    // static adoption — the detector only counts named imports.
    const exhibitOnly = 'import * as DS from "@full-stack-ds/react"; <DS.Accordion />';
    expect(exhibitOnly).not.toMatch(
      new RegExp(`import\\s*\\{[^}]*\\bAccordion\\b[^}]*\\}`),
    );
  });
});
