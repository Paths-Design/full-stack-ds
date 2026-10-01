import type { DesignBindingIR } from '../../packages/ds-codegen/src/design-properties';
export type Framework = "react" | "vue" | "svelte" | "angular" | "lit";

/** The admitted Web framework targets. Single source of truth for display
 * counts (sidebar coverage badges, home stats) so they stay derived rather
 * than hardcoded. Mirrors the build-time list in vite-plugin-fsds-data.ts. */
export const FRAMEWORKS: readonly Framework[] = ["react", "vue", "svelte", "angular", "lit"];

export interface SourceFile {
  filename: string;
  code: string;
}

export interface ComponentSources {
  component?: SourceFile;
  css?: SourceFile;
  hook?: SourceFile;
  /**
   * Every non-test, non-css file in the component's source directory for this
   * framework. Includes the root component, the behavior hook (if any), and
   * any sibling SFC files (e.g. AccordionHeader.vue, AccordionItem.svelte).
   * The preview shells use this to fetch siblings into the iframe so relative
   * imports (`./useFoo`, `./FooBehavior.js`, `./CompoundPart.vue`) resolve.
   */
  siblings: SourceFile[];
}

export interface PropMember {
  name: string;
  type?: string;
  propType?: {
    kind?: string;
    [key: string]: unknown;
  };
  description?: string;
  default?: unknown;
  required?: boolean;
}

export interface PropsBlock {
  description?: string;
  members?: PropMember[];
}

export interface TokenDefinition {
  resolvesTo?: string;
  fallback?: string;
  property?: string;
  layer?: string;
}

export interface DomBinding {
  [attr: string]: string;
}

export interface DomNode {
  componentRef?: string;
  tag?: string;
  /** Name of a consumer-provided region when tag is the `slot` sentinel. */
  name?: string;
  part?: string;
  bindings?: DomBinding;
  on?: DomBinding;
  children?: DomNode[];
  text?: string;
  if?: string;
}

export interface PartDetails {
  description?: string;
  tag?: string;
  role?:
    | "root"
    | "trigger"
    | "content"
    | "overlay"
    | "item"
    | "group"
    | "label"
    | "decoration"
    | "region"
    | "context";
  multiple?: boolean;
  focusable?: boolean | "roving";
  interactive?: boolean;
  portalTarget?: boolean;
  aria?: {
    role?: string;
    attributes?: string[];
  };
  collapsibleTo?: "native-toggle-affordance" | "native-disclosure";
  /** Contract-authored public compound subcomponent. */
  subcomponent?: boolean;
}

export interface AnatomyDetailed {
  parts: string[];
  description?: string;
  details?: Record<string, PartDetails>;
  dom?: DomNode;
}

export interface A11yKeyboard {
  key: string;
  action: string;
}

export interface A11y {
  role?: string;
  labeling?: string[];
  keyboard?: A11yKeyboard[];
  notes?: string[];
}

/** Semantic domain of a state axis, mirroring the category enum on the
 * schema's stateDimension definition. */
export type StateCategory =
  | "interaction"
  | "availability"
  | "selection"
  | "validation"
  | "data"
  | "visibility"
  | "motion"
  | "presentation";

/** One orthogonal state axis, mirroring $defs.stateDimension in
 * packages/ds-contracts/component.contract.schema.json: a stackable axis
 * whose values are mutually exclusive unless `exclusive` is false. */
export interface StateDimension {
  category: StateCategory;
  values: string[];
  /** Base/absence value at first render; excluded from derived selector projections. */
  initial?: string;
  /** Whether values are mutually exclusive; defaults to true when omitted. */
  exclusive?: boolean;
  /** Whole-dimension effect: restyle | overlay | metadata | channel. */
  effect?: "restyle" | "overlay" | "metadata" | "channel";
  description?: string;
  /** Cross-dimension masking while this dimension holds a non-initial value. */
  suppresses?: { categories?: StateCategory[]; names?: string[] };
  /** Authored ARIA projection; semantic values are never fabricated. */
  a11y?: { attribute: string; values?: Record<string, string | boolean> };
  /** Per-value lowering overrides from the shared state-to-selector mapping. */
  derivesFrom?: Record<
    string,
    { selector?: string; attr?: string; channel?: string; prop?: string }
  >;
}

/** Dimensional states model — the sole authoring form in
 * packages/ds-contracts/component.contract.schema.json (`states`). */
export interface ComponentStates {
  dimensions?: Record<string, StateDimension>;
  description?: string;
}

/** Dimensional state entries of a contract, in authored order. Empty when the
 * contract declares no states. The Design view's States section derives from
 * this single accessor. */
export function stateDimensionsOf(
  contract: Pick<ComponentContract, "states">,
): Array<[string, StateDimension]> {
  return Object.entries(contract.states?.dimensions ?? {});
}

export interface ComponentContract {
  $schema?: string;
  name: string;
  description?: string;
  layer: "primitive" | "compound" | "composer" | "assembly";
  cssPrefix?: string;
  anatomy?: string[] | AnatomyDetailed;
  variants?: Record<string, string[]>;
  states?: ComponentStates;
  a11y?: A11y;
  tokens?: Record<string, TokenDefinition>;
  props?: Record<string, PropsBlock>;
  types?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
  compoundParts?: unknown;
  /**
   * Behavioral category axis (action/input/surface/feedback/glyph/display/
   * structure). Carried in every contract JSON; surfaced by the Evidence
   * section. Codegen does not consume it.
   */
  category?: string;
  /**
   * Geometry morphology axis (MORPHOLOGY-GEOMETRY-PROFILE-01). Selects a
   * codegen StyleProfile whose boxModelDefaults layer between the box-model
   * primitive and the authored sidecar. Read by the data plugin to build
   * `ComponentBundle.boxModelSurface`.
   */
  morphology?: string;
  /**
   * Agent-facing authoring metadata. Present in all corpus contracts. The
   * A2UI Descriptor section feeds this (plus props/channels/events/form) to
   * `deriveA2UIDescriptor`. Declared optional + untyped-deep so it stays
   * structurally compatible with the deriver's ComponentContractLike without
   * re-exporting its full type graph into the app.
   */
  a2ui?: {
    category: string;
    usageHints?: string[];
    children?: { allowed: boolean; slot?: string; accepts?: string[]; min?: number; max?: number };
  };
  /** Controlled-state channels. Read by A2UI derivation (events surface). */
  channels?: Record<string, unknown>;
  /** Imperative events. Read by A2UI derivation (events surface). */
  events?: Record<string, unknown>;
  /** Form participation; carried through to the A2UI descriptor unchanged. */
  form?: unknown;
  portal?: {
    enabled?: boolean;
    defaultTarget?: string;
  };
  surface?: {
    kind?: string;
    positioning?: {
      strategy?: "anchored" | "centered" | "viewport-edge" | string;
    };
  };
}

/**
 * A composition tree node from a `<Name>.usage.jsonl` line.
 *
 * Each node has exactly one `fsds.<ContractName>` key (the cross-component
 * reference). The value carries `props` (literals matching the target
 * contract's declared props) and `slots` (sub-trees keyed by anatomy parts).
 * `children` may be a string, a sub-tree, or an array of either — handled
 * uniformly as `props.children`.
 *
 * Schema lives at `packages/ds-contracts/component.usage.schema.json`;
 * cross-contract resolution (ref/props/slot existence) is enforced by the
 * codegen's `--check-usage` pass before the JSONL reaches the showcase.
 */
export type UsageTreeNode = {
  [fsdsRef: string]: UsageNodeBody;
};

export interface UsageNodeBody {
  props?: Record<string, UsagePropValue>;
  /**
   * Slot content keyed by anatomy part. Most slots hold a sub-tree (another
   * component composed in); slots that naturally hold flat text (description,
   * label, simple trigger labels) may use a string directly to avoid wrapping
   * everything in a no-op fsds.Text.
   */
  slots?: Record<string, UsageTreeNode | string>;
}

export interface UsageSubcomponentIR {
  part: string;
  ref: string;
  allowedProps: string[];
}

/** Serializable contract/IR projection consumed by the usage renderer. */
export interface UsageCompositionIR {
  rootRef: string;
  acceptsChildren: boolean;
  childrenRegion: string | null;
  namedSlots: string[];
  subcomponents: UsageSubcomponentIR[];
  propMaterializers: Record<string, "date" | "date-array">;
}

export type UsagePropValue =
  | string
  | number
  | boolean
  | null
  | UsageTreeNode
  | UsagePropValue[]
  | { [key: string]: UsagePropValue };

export interface UsageLine {
  name: string;
  description?: string;
  tree: UsageTreeNode;
}

/**
 * One slot of a component's normalized box-model material surface — the same
 * primitive < morphology-profile < authored-sidecar merge codegen realizes
 * into `<Name>.tokens.css`, projected for the showcase with provenance. The
 * editor inspects THIS, never raw sidecar presence: a component without
 * authored `box-model.*` keys still has a full surface, it is just inherited.
 */
export interface BoxModelSurfaceSlot {
  /** Slot name from the closed pool (e.g. `box-model.min-height`). */
  slot: string;
  /** Dotted token-graph path, when the winning layer binds a token. */
  resolvesTo?: string;
  /** `var()` fallback paired with `resolvesTo`. */
  fallback?: string;
  /** Intentional literal value (mutually exclusive with resolvesTo). */
  literal?: string;
  layer?: "core" | "semantic" | "brand" | "density";
  /** Which merge layer supplied the winning value. */
  source: "authored" | "morphology-profile" | "primitive-default";
}

export interface ComponentBundle {
  /** Typed, independently settable design properties from the style sidecar. */
  designBindings?: DesignBindingIR[];
  name: string;
  contract: ComponentContract;
  contractPath: string;
  sources: Partial<Record<Framework, ComponentSources>>;
  /**
   * Curated composition examples loaded from `<Name>.usage.jsonl`. One entry
   * per line. Empty array when no sidecar exists; downstream renderers should
   * treat that as "no examples to show" without erroring.
   */
  usage: UsageLine[];
  /** Contract-derived consumer composition surface for usage examples. */
  usageComposition: UsageCompositionIR;
  /**
   * Normalized box-model material surface (see BoxModelSurfaceSlot). Computed
   * at bundle-build time by the data plugin using the codegen merge as the
   * single authority. Always the full closed slot pool.
   */
  boxModelSurface: BoxModelSurfaceSlot[];
}

export interface PrimitiveBundle {
  name: string;
  contract: unknown;
  sources: Partial<Record<Framework, SourceFile[]>>;
}

/**
 * Flattened entry for one leaf node in a foundation or brand token JSON.
 *
 * Paths are dotted (e.g. `color.palette.red.500`, `color.foreground.accent`).
 * `value` may be a CSS literal (`#d9292b`), a token reference (`{path.to.other}`),
 * or undefined for branches that only carry `$extensions`. `valueByMode`
 * captures the resolved light/dark split when present so the page can preview
 * both without re-running the resolver.
 */
export interface FoundationToken {
  layer: "core" | "semantic" | "brand";
  /** Dotted path, no `core.`/`semantic.`/brand-name prefix. */
  path: string;
  type?: string;
  description?: string;
  /** Resolved CSS value, or a `{ref}` string if the source still references another token. */
  value?: string;
  /** When the resolved value differs by color mode (light/dark). */
  valueByMode?: { light?: string; dark?: string };
  /** Other extension keys mirrored verbatim so consumers can show palette/mode paths. */
  extensions?: Record<string, unknown>;
}

export interface BrandTokenSet {
  /** Brand id matching the filename stem (`default`, `streaming`, ...). */
  id: string;
  name: string;
  description?: string;
  accent?: string;
  density?: string;
  tokens: FoundationToken[];
}

/** One registered target observed at build time; presence is separate from admission. */
export interface TargetCensus {
  id: string;
  label: string;
  family: "web" | "native" | "descriptor";
  /** Component realizations actually present on disk for this target. */
  componentsShipped: number;
  sourceCoverage: "full" | "partial" | "none";
  executable: boolean;
  /** Registry membership in the rail, not a claim that a run passed. */
  railAdmitted: boolean;
  /** Target carries a component allowlist in fsds.targets.json (e.g. swiftui). */
  allowlisted: boolean;
}

/** Build-time census of the `packages/` tree — the single source of truth for
 * the landing page's headline numbers and target cards. Computed by
 * vite-plugin-fsds-data.ts; never hand-edited. */
export interface Census {
  components: number;
  /** Rendered primitives consumed by the codegen primitive emitter. */
  primitives: string[];
  /** BoxModel supplies geometry defaults separately from rendered primitives. */
  geometryDefaults: boolean;
  /** Governed icons from ds-iconography/icons. */
  icons: number;
  foundationTokens: number;
  /** Sum of component-contract token declarations. */
  componentTokenDeclarations: number;
  /** All files in declared target output trees, including descriptors and metadata. */
  generatedFiles: number;
  targets: TargetCensus[];
  /** Per-target list of component names actually shipped on disk. Drives the
   * landing page's targets × components source coverage matrix. */
  presence: Record<string, string[]>;
}

export interface ActivityEvent {
  id: string;
  kind: "commit" | "spec";
  title: string;
  author: string;
  timestamp: string;
  stats: { commits: number; replies: number; reposts: number };
}

export interface Bundle {
  components: ComponentBundle[];
  primitives: PrimitiveBundle[];
  schema: unknown;
  tokensCss: string;
  /** Flat list of every leaf token under `core.*` and `semantic.*` from `resolved.tokens.json`. */
  foundationTokens: FoundationToken[];
  /** One entry per brand file under `packages/ds-tokens/src/brands/`. */
  brandTokens: BrandTokenSet[];
  /** Live build-time census of the packages tree. Optional so test fixtures
   * that build a minimal Bundle stay valid; the plugin always supplies it. */
  census?: Census;
  /** Build-time activity feed (recent commits + CAWS spec events). Optional so
   * minimal test fixtures stay valid; the plugin always supplies it. */
  activity?: ActivityEvent[];
  generatedAt: number;
}
