#!/usr/bin/env node
/**
 * Token-consumption gate for the game-pause-menu lanes.
 *
 * The provenance gate (game-pause-token-provenance.mjs) proves the authority
 * values agree with the token graph. This gate is the complementary check that
 * the lanes actually route rendering through the token path rather than keeping
 * a private literal copy:
 *
 *   GPUI   — parity loading resolves the palette/type scale via the embedded
 *            token graph + Orion brand, and a runtime test covers every role.
 *   Godot  — the fixture loader resolves authority colours/type sizes through
 *            TokenResolver and the headless tests cover every provenance entry.
 *   Unity  — the parity Card surface uses the generated component token
 *            variable channel from the brand scope, an EditMode test proves the
 *            resolved style follows the theme scope, and the old inline card
 *            colour assignments stay out.
 *
 * This is a source-contract + receipt gate, not a replacement for the runtime
 * tests it points at. Exit 0 when every check passes, 1 otherwise.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const laneRoot = join(repo, "examples/game-pause-menu");
const read = (rel) => readFileSync(join(repo, rel), "utf8");
const failures = [];
const checks = [];

function requireText(label, rel, needles) {
  const file = join(repo, rel);
  if (!existsSync(file)) {
    failures.push(`${label}: missing ${rel}`);
    return;
  }
  const text = read(rel);
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    failures.push(`${label}: ${rel} is missing ${missing.map((needle) => JSON.stringify(needle)).join(", ")}`);
    return;
  }
  checks.push(`${label}: ${rel}`);
}

function forbidText(label, rel, needles) {
  const text = read(rel);
  const present = needles.filter((needle) => text.includes(needle));
  if (present.length) {
    failures.push(`${label}: ${rel} still contains bypass marker(s) ${present.map((needle) => JSON.stringify(needle)).join(", ")}`);
    return;
  }
  checks.push(`${label}: no bypass markers in ${rel}`);
}

const lanes = [
  {
    id: "gpui",
    required: [
      ["GPUI loader", "examples/game-pause-menu/gpui/src/seam/tokens.rs", [
        "RESOLVED_TOKENS_JSON", "ORION_BRAND_JSON", "resolve_palette", "resolve_type_scale",
      ]],
      ["GPUI parity wiring", "examples/game-pause-menu/gpui/src/seam/parity.rs", [
        "apply_token_authority(&mut layout)", "resolve_palette", "resolve_type_scale",
        "color_tokens", "type_tokens",
      ]],
      ["GPUI consumption test", "examples/game-pause-menu/gpui/tests/parity.rs", [
        "loaded_palette_consumes_every_authority_colour_token",
        "resolve_color", "resolve_size",
      ]],
    ],
    forbidden: [],
  },
  {
    id: "godot",
    required: [
      ["Godot resolver", "examples/game-pause-menu/godot/scripts/token_resolver.gd", [
        "apply_to_authority", "resolve_color", "resolve_size",
      ]],
      ["Godot fixture wiring", "examples/game-pause-menu/godot/scripts/fixture_loader.gd", [
        "_resolve_token_palette()", "TokenResolver.load_from_project()", "resolver.apply_to_authority(parity_layout)",
      ]],
      ["Godot setup copy", "examples/game-pause-menu/godot/setup.sh", [
        "resolved.tokens.json", "orion.tokens.json", "fixtures/ds-tokens",
      ]],
      ["Godot consumption tests", "examples/game-pause-menu/godot/tests/run_tests.gd", [
        "every parity colour resolves through its token provenance",
        "every parity type size resolves through its token provenance",
      ]],
    ],
    forbidden: [],
  },
  {
    id: "unity",
    required: [
      ["Unity lane token channel", "examples/game-pause-menu/unity/Assets/PauseMenu/Resources/Styles/PauseMenu.uss", [
        "--fsds-card-color-background-default: var(--fsds-semantic-color-background-secondary)",
        "--fsds-card-color-border: var(--fsds-semantic-color-border-subtle)",
        "--fsds-card-size-radius: var(--fsds-semantic-shape-card-radius)",
      ]],
      ["Unity consumption test", "examples/game-pause-menu/unity/Assets/PauseMenu/Tests/Editor/TokenConsumptionTests.cs", [
        "PanelSurfaceResolvesThroughTheOrionBrandTokenChannel",
        "Theme.SetDark(host.App.Root, false)",
        "resolvedStyle.backgroundColor",
      ]],
    ],
    forbidden: [
      ["Unity bypass", "examples/game-pause-menu/unity/Assets/PauseMenu/Runtime/App/Ui.cs", [
        "root.style.backgroundColor = layout.Color(layout.Panels.Background)",
      ]],
      ["Unity bypass", "examples/game-pause-menu/unity/Assets/PauseMenu/Runtime/App/AbilitiesTab.cs", [
        'card.style.backgroundColor = layout.Color("charcoal")',
      ]],
    ],
  },
];

for (const lane of lanes) {
  for (const [label, rel, needles] of lane.required) requireText(`${lane.id}/${label}`, rel, needles);
  for (const [label, rel, needles] of lane.forbidden) forbidText(`${lane.id}/${label}`, rel, needles);
}

// The parity authority itself must still carry provenance for every value.
const authority = JSON.parse(read("examples/game-pause-menu/fixtures/parity-layout.json"));
const colors = Object.keys(authority.colors ?? {});
const colorTokens = authority.colorTokens ?? {};
const type = Object.keys(authority.type ?? {});
const typeTokens = authority.typeTokens ?? {};
if (colors.length !== 19) failures.push(`authority: expected 19 colours, found ${colors.length}`);
if (type.length !== 21) failures.push(`authority: expected 21 type values, found ${type.length}`);
for (const name of colors) if (!colorTokens[name]?.token) failures.push(`authority colour ${name} has no token provenance`);
for (const key of type) if (!typeTokens[key]?.token) failures.push(`authority type ${key} has no token provenance`);

// Goldens and oracle must be present so a lane cannot silently drop the
// regression/design-baseline half of the claim.
if (!existsSync(join(laneRoot, "evidence/goldens/goldens.json"))) failures.push("goldens: no committed golden manifest");
if (!existsSync(join(laneRoot, "fixtures/orion-style-oracle.json"))) failures.push("oracle: no committed source-design oracle");

if (failures.length) {
  console.error(`game-pause token consumption: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
console.log(`game-pause token consumption: ${checks.length} lane contract check(s) pass`);
console.log(`authority: ${colors.length} colours / ${type.length} type values all carry provenance`);
console.log("runtime evidence: GPUI all-role test, Godot all-provenance test, Unity brand-scope resolved-style test");
