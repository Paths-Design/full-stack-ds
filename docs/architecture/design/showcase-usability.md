---
doc_id: REF-SHOWCASE-USABILITY-001
authority: reference
status: active
title: Showcase component usability
owner: "@darianrosebrook"
updated: 2026-11-05
---

# Showcase component usability

`SHOWCASE-COMPONENT-USABILITY-01` follows the browser findings on Card, the
command palette, panel visibility, token links, and Walkthrough examples.

Card no longer owns a status axis or an accent side border. Its badge part is
an unpainted layout region for a composed Badge or Status. The retired status
and badge-color tokens are removed from the sidecar and generated consumers;
there are no compatibility aliases.

Dialog owns panel width and maximum dimensions. Its body can shrink and
scroll, and its maximum height is an optional design override
with a dynamic-viewport fallback. The showcase palette sizes its content from
the available body width and uses compact, wrapping navigation rows.

The header provides independent navigation and inspector buttons that remain
reachable when the corresponding panel is collapsed. The palette exposes the
same actions. Command-Backslash (Control-Backslash on other keyboards) toggles
both panels. A narrow viewport starts with the inspector closed; its button
opens the inspector as a side panel.

The token explorer orders Brand, Semantic, then Core. Token names are text;
the adjacent permalink control preserves a stable row URL and selected brand. Reference links
reveal a destination hidden by layer or text filters. The hash router separates
the path from query parameters so a token URL also survives reload.

Programmatic overlay examples start with a launcher. Their portal stays under
the example's token scope, but the launched surface uses viewport geometry.
Dismissal restores focus and permits reopening. Ordinary anchored examples
retain their confined preview canvas.

Walkthrough's example supplies actual anchors and owns the visible lifecycle
and sequence boundaries. The contract exposes previous/next requests, a
previous-action disabled state, next-action label, and progress text. Step
dots emit the requested index through the existing channel binding. Consumers
update index and title/description together and decide when the tour finishes.
This slice does not establish built-in persistence, automatic start, or native
anchored-tour behavior. It does not introduce a framework-specific tour engine.

Verification lives in `e2e/showcase-usability.spec.ts`,
`e2e/showcase-portal-containment.spec.ts`, the usage-renderer tests, and the
native channel-call emission tests. Browser measurements and screenshots cover
palette containment, Card paint, panel actions, token navigation and a complete
tour. The generation rail and framework suites establish their respective
admission and regression facts; screenshots remain local evidence.
