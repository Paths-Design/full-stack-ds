/** kotlin/grammar.ts — extracted from component-source.ts under
 * CODEGEN-NATIVE-EMITTER-SPLIT-01 (verbatim move; generated output
 * byte-identical). See component-source.ts for the dispatch order.
 *
 * This module is the compose target's DECLARED grammar-table home: the
 * framework-grammar dimension tables and the corpus token-namespace
 * prefixes the emitters' slot queries key on. The emitter-authority guard
 * admits name-keyed string constants HERE and nowhere else in the compose
 * tree — a new namespace prefix is a deliberate edit to this file, and the
 * durable fix for any of these is a declared IR fact (the dateGrid /
 * transfer / surface-kind precedent), not a new prefix.
 *
 * Classification for every constant below, per docs/codegen-authority.md:
 *   source fact:    framework grammar | corpus token-namespace grammar
 *   applies by:     token slot-name namespace / size-value vocabulary
 *   removable when: the token graph carries the slot as a declared,
 *                   resolvable fact the IR normalizes
 */


/**
 * Track dimensions per size value (width x height, dp). Framework grammar.
 * The corpus carries two size vocabularies (Switch: sm/md/lg;
 * ToggleSwitch: small/medium/large) — both map onto the same physical
 * ladder. md is contract-token-shaped; the rest are annotated defaults
 * pending token-graph coverage.
 */
export const SIZE_TRACK_DP: Record<string, [number, number]> = {
  sm: [36, 18],
  md: [48, 24],
  lg: [60, 30],
  small: [36, 18],
  medium: [48, 24],
  large: [60, 30],
};

/** Checkbox visual-box side per size value (dp) — the boolean-control
 *  class's framework-grammar table, the twin of SIZE_TRACK_DP. The token
 *  graph carries no checkbox box-size slot yet; when it does, the default
 *  size resolves through the scopes exactly as the toggle's md does. */
export const CHECKBOX_BOX_DP: Record<string, number> = {
  sm: 14,
  md: 18,
  lg: 22,
  small: 14,
  medium: 18,
  large: 22,
};

/** Typography-bearing content roots are detected by `text.size.*` slots in
 *  the token scopes — the same slot evidence the compose/RN parity ratchet
 *  keys on (FEAT-COMPOSE-TYPOGRAPHY-CONTENT-01). */
export const TYPOGRAPHY_SIZE_INFIX = "text.size.";

/** The font-weight axis names its slots `text.typography.fontWeight.<v>`,
 *  with the weight-value→slot synonym table living at the detection site. */
export const TYPOGRAPHY_WEIGHT_PREFIX = "text.typography.fontWeight.";

/** The progress-indicator class detects its per-axis slot namespaces by
 *  prefix (`spinner.size.*`, `spinner.thickness.*`) — the corpus namespace
 *  for the determinate/indeterminate indicator axes. */
export const PROGRESS_SIZE_PREFIX = "spinner.size.";
export const PROGRESS_THICKNESS_PREFIX = "spinner.thickness.";
