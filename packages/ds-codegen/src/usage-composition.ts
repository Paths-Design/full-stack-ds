/**
 * Framework-neutral projection of the consumer composition surface used by
 * curated usage examples.
 *
 * The contract/IR owns which content paths exist. The usage validator and the
 * showcase renderer consume this serializable projection rather than each
 * guessing from anatomy names or probing framework exports.
 */
import type { ComponentContract } from "./contract.js";
import {
  buildComponentIR,
  hasChildrenPlaceholder,
  nativeTableAttrsFor,
  TABLE_COMPOSITION_TAGS,
  type ComponentIR,
  type PartIR,
  type PropTypeIR,
} from "./ir.js";

/** How a JSON sidecar value becomes its typed runtime value: an ISO string to
 *  a Date, each entry of an array to a Date, or either by the value's shape. */
export type UsagePropMaterializer = "date" | "date-array" | "date-union";

export interface UsageSubcomponentIR {
  /** Exact contract anatomy part name. */
  part: string;
  /** Canonical sidecar reference, for example `fsds.Table.Head`. */
  ref: string;
  /** Props the generated public part surface can consume. */
  allowedProps: string[];
}

export interface UsageCompositionIR {
  rootRef: string;
  acceptsChildren: boolean;
  /** Semantic region that the contract identifies as the default child host. */
  childrenRegion: string | null;
  namedSlots: string[];
  subcomponents: UsageSubcomponentIR[];
  /** JSON sidecar values that require typed runtime materialization. */
  propMaterializers: Record<string, UsagePropMaterializer>;
}

export interface ParsedUsageRef {
  rootName: string;
  rootRef: string;
  part: string | null;
}

const USAGE_REF = /^fsds\.([A-Z][A-Za-z0-9]*)(?:\.([a-z][A-Za-z0-9]*))?$/;

export function parseUsageRef(ref: string): ParsedUsageRef | null {
  const match = USAGE_REF.exec(ref);
  if (!match) return null;
  return {
    rootName: match[1],
    rootRef: `fsds.${match[1]}`,
    part: match[2] ?? null,
  };
}

/**
 * A required-region obligation an owning occurrence failed to discharge.
 * `path` locates the owing occurrence within the frame tree (e.g.
 * "/fsds.Card/children[1]/fsds.Card") so failures identify WHO owes the
 * region, not merely that the region name appears somewhere in the frame.
 */
export interface RequiredRegionViolation {
  component: string;
  path: string;
  region: string;
  supplied: string[];
}

interface Occurrence {
  component: string;
  path: string;
  regions: Set<string>;
}

/**
 * Find required-region violations in a curated usage frame, preserving
 * occurrence ownership (FIX-SLOT-REQUIRED-OWNERSHIP-01).
 *
 * The walk mirrors the renderer's composition routing rather than defining a
 * second interpretation: each usage node carries exactly one `fsds.*` ref; a
 * node-level or props-level `slots` map delivers regions to THAT occurrence;
 * an `fsds.X.<region>` child delivers to the enclosing occurrence only when
 * that occurrence's component is X (otherwise it renders an orphan
 * subcomponent element and supplies nothing); a nested `fsds.X` root — under
 * any occurrence's children or slot content, even the same component — is a
 * NEW ownership context whose supply never discharges its enclosing
 * occurrence. Every full occurrence is checked against its own component's
 * obligations, including occurrences nested inside other components' frames.
 * Frame-data-level only — never DOM-inferred.
 */
export function findRequiredRegionViolations(
  frameTree: unknown,
  obligationsFor: (component: string) => RequiredRegionObligation[],
): RequiredRegionViolation[] {
  const violations: RequiredRegionViolation[] = [];
  visitUsageNode(frameTree, "", obligationsFor, violations);
  return violations;
}

function visitUsageNode(
  node: unknown,
  path: string,
  obligationsFor: (component: string) => RequiredRegionObligation[],
  violations: RequiredRegionViolation[],
): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (!key.startsWith("fsds.")) continue;
    const rest = key.slice("fsds.".length);
    const dot = rest.indexOf(".");
    const component = dot > 0 ? rest.slice(0, dot) : rest;
    const part = dot > 0 ? rest.slice(dot + 1) : null;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    const props =
      record.props && typeof record.props === "object" && !Array.isArray(record.props)
        ? (record.props as Record<string, unknown>)
        : {};
    const here = `${path}/${key}`;

    if (part === null) {
      // Full occurrence: its own ownership context.
      const occurrence: Occurrence = { component, path: here, regions: new Set() };
      collectSlotEntries(record.slots, occurrence.regions);
      collectSlotEntries(props.slots, occurrence.regions);
      const children = childList(props.children);
      children.forEach((child, index) => {
        // Same-component part refs in THIS occurrence's children deliver to it.
        deliverPartRefs(child, component, occurrence.regions);
        // Every child subtree is its own ownership context (nested roots).
        visitUsageNode(child, `${here}/children[${index}]`, obligationsFor, violations);
      });
      // Slot content may itself contain nested component roots.
      for (const source of [record.slots, props.slots]) {
        if (!source || typeof source !== "object" || Array.isArray(source)) continue;
        for (const [region, content] of Object.entries(source as Record<string, unknown>)) {
          visitUsageNode(content, `${here}/slots/${region}`, obligationsFor, violations);
        }
      }
      for (const obligation of obligationsFor(component)) {
        if (!occurrence.regions.has(obligation.region)) {
          violations.push({
            component,
            path: here,
            region: obligation.region,
            supplied: [...occurrence.regions].sort(),
          });
        }
      }
    } else {
      // Part occurrence: region content, not an obligated instance. Only
      // nested roots inside its content create further occurrences.
      const children = childList(props.children);
      children.forEach((child, index) => {
        visitUsageNode(child, `${here}/children[${index}]`, obligationsFor, violations);
      });
    }
  }
}

function childList(children: unknown): unknown[] {
  if (Array.isArray(children)) return children;
  if (children && typeof children === "object") return [children];
  return [];
}

function deliverPartRefs(child: unknown, ownerComponent: string, out: Set<string>): void {
  if (!child || typeof child !== "object" || Array.isArray(child)) return;
  for (const key of Object.keys(child as Record<string, unknown>)) {
    if (!key.startsWith("fsds.")) continue;
    const rest = key.slice("fsds.".length);
    const dot = rest.indexOf(".");
    if (dot <= 0) continue;
    if (rest.slice(0, dot) === ownerComponent) out.add(rest.slice(dot + 1));
  }
}

function collectSlotEntries(slots: unknown, out: Set<string>): void {
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) return;
  for (const [region, content] of Object.entries(slots as Record<string, unknown>)) {
    if (content !== undefined && content !== null && content !== false && content !== "") {
      out.add(region);
    }
  }
}

export interface RequiredRegionObligation {
  component: string;
  region: string;
}

/**
 * Consumer-supplied regions whose contract slot declares `required: true` —
 * every curated usage frame must supply them (enforced by the showcase usage
 * audit). "Consumer-supplied" is deliberately NARROWER than the frame-ref
 * validator's public-subcomponent set (which also admits surface anchors,
 * table tags, and compound roles for `fsds.X.Y` reference validity): only
 * anatomy.dom named slot nodes and explicit `subcomponent: true` parts are
 * regions a composing consumer targets. Component-owned required anchors
 * (the anchor-presence sense, e.g. `Checkbox.input`) and the `root` host
 * anchor are excluded (FEAT-SLOT-REQUIRED-USAGE-BINDING-01).
 */
export function deriveRequiredRegionObligations(
  contract: ComponentContract,
): RequiredRegionObligation[] {
  const consumerSupplied = new Set<string>();
  const visitDom = (node: unknown): void => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const record = node as Record<string, unknown>;
    if (record.tag === "slot" && typeof record.name === "string") {
      consumerSupplied.add(record.name);
    }
    const children = record.children;
    if (Array.isArray(children)) children.forEach(visitDom);
    else if (children && typeof children === "object") visitDom(children);
  };
  const anatomy = contract.anatomy;
  if (anatomy && !Array.isArray(anatomy)) visitDom(anatomy.dom);
  for (const [part, details] of Object.entries(anatomy && !Array.isArray(anatomy) ? anatomy.details ?? {} : {})) {
    if (details && typeof details === "object" && (details as { subcomponent?: unknown }).subcomponent === true) {
      consumerSupplied.add(part);
    }
  }

  const obligations: RequiredRegionObligation[] = [];
  for (const [slot, meta] of Object.entries(contract.slots ?? {})) {
    if (!meta || typeof meta !== "object" || (meta as { required?: unknown }).required !== true) continue;
    if (slot === "root") continue;
    if (!consumerSupplied.has(slot)) continue;
    obligations.push({ component: contract.name, region: slot });
  }
  return obligations;
}

export function deriveUsageComposition(
  contract: ComponentContract,
): UsageCompositionIR {
  return deriveUsageCompositionFromIR(contract, buildComponentIR(contract));
}

export function deriveUsageCompositionFromIR(
  contract: ComponentContract,
  ir: ComponentIR,
): UsageCompositionIR {
  const acceptsChildren = ir.dom ? hasChildrenPlaceholder(ir) : true;
  const namedSlots = new Set<string>();
  if (ir.dom) {
    const visit = (node: ComponentIR["dom"]): void => {
      if (!node) return;
      if (node.tag === "slot" && node.slotName) namedSlots.add(node.slotName);
      for (const child of node.children) visit(child);
    };
    visit(ir.dom);
  }
  const propMaterializers: Record<string, UsagePropMaterializer> = {};
  const isDate = (type: PropTypeIR) => type.kind === "ref" && type.to === "Date";
  const isDateArray = (type: PropTypeIR) => type.kind === "array" && isDate(type.items);
  for (const prop of ir.styledProps) {
    const type = prop.propType;
    if (isDate(type)) {
      propMaterializers[prop.name] = "date";
    } else if (isDateArray(type)) {
      propMaterializers[prop.name] = "date-array";
    } else if (
      // A value channel typed `Date | Date[] | null` (a single day or a span).
      type.kind === "union" &&
      type.of.some((arm) => isDate(arm) || isDateArray(arm)) &&
      type.of.every((arm) => isDate(arm) || isDateArray(arm) || (arm.kind === "literal" && arm.value === null))
    ) {
      propMaterializers[prop.name] = "date-union";
    }
  }

  return {
    rootRef: `fsds.${ir.name}`,
    acceptsChildren,
    childrenRegion: acceptsChildren
      ? contract.a2ui?.children?.slot ?? "children"
      : null,
    namedSlots: [...namedSlots].sort(),
    propMaterializers,
    // Public compound parts come from explicit contract ownership or from a
    // semantic IR family that necessarily emits consumer-composed parts.
    // Legacy name classification alone is never enough.
    subcomponents: ir.parts
      .filter((part) => isPublicSubcomponent(ir, part))
      .map((part) => ({
        part: part.name,
        ref: `fsds.${ir.name}.${part.name}`,
        allowedProps: allowedPartProps(ir, part),
      }))
      .sort((a, b) => a.part.localeCompare(b.part)),
  };
}

function isPublicSubcomponent(ir: ComponentIR, part: PartIR): boolean {
  if (part.isExplicitSubcomponent) return true;
  if (part.nativeTag && TABLE_COMPOSITION_TAGS.has(part.nativeTag) && part.isCompound) {
    return true;
  }
  if (
    ir.surface?.anchor?.part.name === part.name ||
    ir.surface?.content?.part.name === part.name
  ) {
    return true;
  }

  // Stateful compound containers expose their repeated/group, interactive,
  // and region parts for consumer composition. This is the same semantic
  // distinction the framework emitters lower; owned ornaments/wrappers stay
  // excluded even when their historical name appears in COMPOUND_PARTS.
  if (ir.behavior.normalizedChannels.length > 0) {
    const role = part.details?.role;
    return (
      (part.details?.multiple === true && (role === "item" || role === "region")) ||
      (part.details?.interactive === true && (role === "trigger" || role === "item")) ||
      (part.isCompound && role === "group")
    );
  }

  return false;
}

function allowedPartProps(ir: ComponentIR, part: PartIR): string[] {
  const props = new Set(["children", "className", "data-testid"]);
  for (const attr of nativeTableAttrsFor(part.nativeTag)) props.add(attr);

  // These capabilities are derived from semantic part facts, not component
  // names. They mirror the generated compound families' public inputs.
  if (part.details?.interactive) props.add("disabled");
  if (ir.surface?.anchor?.part.name === part.name) props.add("asChild");
  if (
    Object.keys(ir.behavior.channels ?? {}).length > 0 &&
    ["trigger", "item", "region", "content"].includes(
      part.details?.role ?? "",
    )
  ) {
    props.add("value");
  }

  return [...props].sort();
}
