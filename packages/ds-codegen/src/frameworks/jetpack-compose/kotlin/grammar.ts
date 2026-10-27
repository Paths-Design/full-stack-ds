/** kotlin/grammar.ts — extracted from component-source.ts under
 * CODEGEN-NATIVE-EMITTER-SPLIT-01 (verbatim move; generated output
 * byte-identical). See component-source.ts for the dispatch order. */


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
