# Token theming

Music and pinboard page compositions explore how generated React components take on distinct visual identities through scoped token and design-property overrides. Original deterministic SVG artwork keeps the media local. The pinboard header uses the repository's profile photo.

## Run

From the repository root:

```sh
pnpm install
pnpm run dev:token-theming
```

The root Vite server serves both pages:

- [Music](http://localhost:5173/examples/token-theming/index.html?page=spotify)
- [Pinboard](http://localhost:5173/examples/token-theming/index.html?page=pinterest)

`pnpm run build:token-theming` emits a standalone production bundle in `dist/token-theming/`. Serve that directory over HTTP and select either page with the same query parameters.

## What this pressures

`pages.tsx` loads the shared theme and selects a composition. `spotify.tsx` and `pinterest.tsx` compose generated React controls; `theme.css` supplies the scoped themes and `pinterest.css` supplies pinboard layout and chrome. Artwork generators and the adjudicated token audit baseline live alongside them.

The music page exercises local navigation, library filtering, album details and player controls. Pinboard exercises search variants, grouped navigation, tooltips, account and notification panels, the audience dialog, pin details, save and comment flows, and measured masonry placement.

This example imports generated React sources and token CSS from the repository so the root development server can show current generated output. It is an appearance and interaction witness, separate from the package-export consumption and framework-parity lanes in [the examples portfolio](../README.md).

## Checks and limits

```sh
pnpm run build:token-theming
pnpm run audit:retoken-tokens
node scripts/audit-retoken-tokens.selftest.mjs
FSDS_E2E_PORT=5198 pnpm exec playwright test e2e/retoken-pages.spec.ts e2e/pinterest-chrome.spec.ts --workers=2
```

Playwright tests remain under `e2e/` and open this example's entry point. The static audit retains its existing adjudications; it does not prove every declaration is consumed in every rendered state. The separate runtime probe is `scripts/retoken-token-probe.mjs`.

These are finite local compositions: business actions, playback, notifications and account flows are demonstrations. They do not establish backend integration, product-identical visuals, accessibility adequacy, cross-framework parity or virtualized feed behavior. [Detailed requirements and proof limits](../../docs/architecture/design/retoken-page-attempts.md) describe the existing witnesses.
