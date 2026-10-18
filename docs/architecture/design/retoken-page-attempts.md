---
doc_id: ARCH-RETOKEN-PAGE-ATTEMPTS-001
authority: architecture
status: active
title: Retokening page attempts
owner: "@darianrosebrook"
updated: 2026-10-18
governs:
  - e2e/fixtures/retoken-pages/**
  - e2e/retoken-pages.spec.ts
---

# Spotify and Pinterest as consumer probes

These are bounded Web DOM attempts, using real generated React components,
original SVG artwork, and deterministic sample content. They test whether the
existing controls can carry substantially different visual identities. They do
not implement streaming, recommendations, an authenticated Pinterest account,
or pixel-identical copies of third-party pages.

## Materials and reference scope

| Material | Available source | Use |
|---|---|---|
| Spotify desktop reference | [Official June 2023 redesign](https://newsroom.spotify.com/2023-06-20/spotify-desktop-experience-redesign-your-library-now-playing-views-customize/) and its [published image](https://storage.googleapis.com/pr-newsroom-wp/1/2023/06/FTR-Header-v.2-x2-1920x733.jpg) | Library, discovery, now-playing panels and persistent playback strip. A fixed dated reference, not a claim about today's account UI. |
| Pinterest feed semantics | [Home feed help](https://help.pinterest.com/en/article/explore-the-home-feed), [public discovery](https://www.pinterest.com/ideas), [official Masonry source](https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Masonry.tsx) and its [visual fixture](https://raw.githubusercontent.com/pinterest/gestalt/master/playwright/visual-test/Masonry.spec.ts-snapshots/Masonry-chromium-darwin.png) | Image-led discovery, variable-height columns, search and saved ideas. Public pages inspected September 6, 2026; no personalized feed accessed. |
| Existing brand | [Streaming tokens](../../../packages/ds-tokens/src/brands/streaming.tokens.json) | Existing semantic palette/shape/density vocabulary; the attempts independently scope exact component overrides to test those controls. |
| Components | [Contract corpus](../../../packages/ds-contracts/components/) | Card/media/content, Image, Button, Input, Text, Progress and Icon, composed with Stack. |
| Icons | [Owned icon catalog](../../../packages/ds-iconography/icons/) | Home, search, navigation arrows, panels and overflow. Use canonical kebab-case names. No play/pause/volume glyphs in the inspected catalog; text labels carry the bounded controls. |
| Artwork | [Original deterministic studies](../../../e2e/fixtures/retoken-pages/artwork.ts) | Local data-URI SVGs. No network images, proprietary fonts, logos or copied media committed. |

## Requirements minus available controls

| Required decision | Existing control | Initial disposition |
|---|---|---|
| Dark/white surfaces, primary/secondary text, green/red actions | Component background/foreground bindings with semantic/literal fallbacks | Available; exercised in both attempts. |
| Flat cards, independent media corners, pill buttons and search | Card border/shadow/radius/media slots; Button/Input radius | Available; independently overridden without component internals. |
| Type sizes/weights and compact spacing | Text props and typography slots, component spacing, shared box controls | Available. System font is inherited from the page; no proprietary font fidelity claimed. |
| Small fixed thumbnails | Image width/height props | **Defect:** attributes are emitted, but generated root `width:auto;height:auto` overrides their presentational hints. Intrinsic 600×800 art blows up the library/player. |
| Square album art and mixed-ratio Pins | Image `aspectRatio` presets | **Defect:** prop is declared and destructured but never realized. Computed ratio remains `auto`. |
| Cover cropping and focal position | Image `objectFit` / `objectPosition` props | **Defect:** props are dropped. Computed fit remains `fill`, position `50% 50%`. |
| Multi-panel shell, responsive breakpoints, background gradient | Consumer composition | Authored on page containers. No reason to add an arbitrary gradient or panel-layout token merely for these pages. |
| Variable-height feed | Consumer CSS columns | Bounded layout, with sequential column reading order. No shortest-column placement, infinite loading, virtualization or scroll anchoring claim. |
| Save affordance, keyboard access and search | Button/Input semantics plus consumer state | Exercised by browser tests. Overlay placement/reveal is consumer composition. |
| Seeking/volume | No Slider contract in inspected corpus | Progress is a read-only indicator. Full playback controls would need a separately justified interaction component; they are not a color/token defect. |
| Exact branded motion | Card's fixed hover translation, duration/easing slots | Unexercised: these cards do not use `interactive`. No claim that every motion characteristic is retokenable. |
| Broken-image recovery | Image declares fallback/placeholder props | Not exercised by deterministic valid assets; the attempt does not establish their behavior. |

## Run and inspect

Run `pnpm run tokens:build`, then `pnpm run dev`. Open
`/e2e/fixtures/retoken-pages/index.html?page=spotify` or `?page=pinterest`.
The source is [pages.tsx](../../../e2e/fixtures/retoken-pages/pages.tsx),
with [theme.css](../../../e2e/fixtures/retoken-pages/theme.css) separating page
geometry from component controls. There are no appearance declarations that
reach into generated component parts. The page's system font, backgrounds,
container spacing, columns and overlay positioning belong to composition.

Run `FSDS_E2E_PORT=5198 pnpm exec playwright test e2e/retoken-pages.spec.ts --workers=2`.
The suite writes desktop/narrow screenshots and `media-facts.json` under
`test-results/`, checks search/save/play-selection behavior and horizontal
overflow, and verifies representative component overrides. Its initial green
interaction result did **not** prove media sizing: manual image review and
computed geometry exposed the failures above. Preserve that distinction when
reading a passing result.

The initial failures justify an Image contract/style repair through the existing
DOM realization mechanisms. They do not justify changing semantic dependency
direction or inventing a second styling runtime. Follow-up acceptance must assert
actual image dimensions, cropping, preset ratios, override precedence and clearing
across Web DOM targets, then re-render these same pages.

## Upstream repair and result

`IMAGE-MEDIA-CONTROLS-01` repairs the three Image gaps in the table above. Root
defaults preserve the width/height attributes. Existing ratio/fit/position props
now lower through the contract, with independently settable design overrides and
literal fallbacks. Finite CSS-variable maps reuse the existing attribute-map
schema and IR validation. No Image-name branch was added to any emitter.

The cross-framework attempt caught two additional lowering defects. Angular's
IDL dimension setters converted an unset height into zero; removable attribute
bindings now preserve the automatic axis. React's rest spread replaced generated
inline bindings when a consumer supplied `style`; merging now preserves those
bindings while allowing individual consumer values to win. Native runtime-use
collection no longer treats a web CSS binding as evidence of native consumption.

[Image browser checks](../../../e2e/image-media.spec.ts) assert fixed dimensions,
every ratio preset, fit and focal position, scoped overrides, clearing back to
props/defaults, and box precedence across React, Vue, Svelte, Lit and Angular.
The React inline-style test failed before its repair. The original dimension
assertion failed at 600px instead of 48px; the Angular automatic-axis assertion
failed at 0px instead of 240px. These are regression witnesses, not merely green
render smoke tests. The page suite now asserts square album art, mixed-ratio Pins,
thumbnail dimensions and a bounded player height in addition to interactions.

Visual review confirms the intended dark multi-panel composition and white
variable-height image feed at desktop and narrow widths. The final assessment is
that the current Web controls support these two bounded visual compositions after
the media repairs. Exact product fidelity, custom fonts/photos, full playback,
shortest-column layout/virtualization, image-error recovery, and arbitrary motion
remain outside this evidence. The remaining work is named by those product or
component capabilities, not by an undifferentiated token-coverage percentage.

## Feed refinement and Pin navigation

The supplied Pin-detail screenshot became the reference for a second pass:
compact navigation, denser recommendation cards, smaller captions and overflow
actions. The feed now uses original editorial boards and preserves the music
page's separate artwork. Activating a Pin opens its own query-string URL with
the full image, information, a board chooser, local save/like/comment controls,
and related Pins. Browser Back restores the feed and its focused Pin. Narrow
layouts stack the detail and recommendations.

The caption attempt exposed `Text.truncate` as declared but unconsumed. The
upstream `TEXT-TRUNCATE-BINDING-01` repair uses the existing conditional binding
syntax and style sidecar; the fixture does not supply a private truncation rule.
The stricter fixture typecheck also exposed the missing Text children outlet;
projection checks then exposed Angular content loss across polymorphic hosts.
Both are repaired upstream, with a shared Angular template for the projected body.
The browser suite checks navigation, direct links, invalid Pin ids, local state,
keyboard access, overflow menus, and both viewport layouts.

Save, board, like, comment, and hide state is in-memory for the current page
session. Comments do not post to Pinterest or any service. Copy-link uses the
local browser clipboard and reports failure if unavailable. Recommendations
are a fixed local collection, not personalization. The reference's account
analytics, advertising tools, photo assets, and complete icon set are not
reproduced. CSS columns retain their sequential reading order and bounded
collection; this remains a composition witness, not a virtualized feed.

## Visual audit repairs (October 2026)

A browser-render audit at 1440/900/390 px surfaced four defects the interaction
suite could not see, all repaired in this slice (`RETOKEN-VISUAL-FIXES-01`):

| Defect | Repair |
|---|---|
| Popover content portals to `document.body`, outside the page's `.retoken` scope; menu buttons fell back to the default 1px brand border and 16px text | `.pin-menu` now carries every page-scope variable it relies on (border width, base text size); the suite asserts computed `0px`/`14px` inside an open menu |
| Quick-pick labels clipped mid-glyph at narrow widths (`white-space: nowrap; text-overflow: clip`) | Label span constrained with ellipsis. **Upstream control gap recorded:** Button exposes no label-truncation control (`Text.truncate` has no Button counterpart); the fixture's `.quick-pick .button > span` selector is a documented structural selector inside a component root, not a pattern to copy |
| Boards sharing a `kind` rendered identical display text (three "Material futures.", three "Independent minds."), reading as duplicates inside one rail | `pinArtwork` derives each board's display text from a per-pin `headline`, with per-index issue numbers and rotated card labels; the suite asserts every related-rail image has a distinct decoded text content |
| Comment form floated on `margin-top: auto` with `padding-top: 36px`, leaving a dead band above it whenever a pin has no comments | Fixed 16px offset; the suite bounds the comments-to-form gap at ≤24px |

Polish in the same slice: the library "Home" button left-aligns with the
"Soundroom" heading (Button's flex centering had centered the label inside its
stretched box), and Save overlays at ≤700px use a smaller footprint so they
cover less artwork. The suite asserts both. The detail view's back chip still
overlaps text baked into some artwork; as an overlay control that collision is
inherent and stays a composition decision rather than a defect.
