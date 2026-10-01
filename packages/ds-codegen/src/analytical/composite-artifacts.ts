import type { BaselineDecl, Channel, CompositeJudgment, Program, QualifiedRelationResult, ScalePolicy, ScaleSharing } from "./projection.js";

export type CarriedView = { kind: "qualified"; dataset: string; field: string; channel: Channel };
export type CarriedPart = CarriedView | { kind: "composite"; composite: CarriedComposite };
export type CarriedComposite =
  | { combinator: "layer"; parts: CarriedPart[]; sharing: Partial<Record<Channel, ScaleSharing>> }
  | { combinator: "facet"; parts: CarriedPart[]; partition: string; policy: Partial<Record<Channel, ScalePolicy>> }
  | { combinator: "embed"; host: Program; budget: readonly Channel[]; cellBaseline: BaselineDecl; part: CarriedPart };
export interface CompositeCarrier {
  version: 1;
  authority: { name: "compositeOutputBasis"; digest: string };
  composition: CarriedComposite;
  datasets: Array<{ id: string; result: QualifiedRelationResult }>;
  judgment: CompositeJudgment;
}
export type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;
export interface MetricScale { origin: number; unitsPerValue: number }
export interface CompositeReadbackArtifact { kind: "composite-readback"; carrier: CompositeCarrier }
type EncodedResult = Omit<QualifiedRelationResult, "observations"> & {
  observations: Array<{ key: QualifiedRelationResult["observations"][number]["key"]; text: Record<string, string>; positions: Record<string, number> }>;
};
export interface CompositeMetricArtifact {
  kind: "composite-metric";
  scale: MetricScale;
  /** One viewport for the selected shared-position scope, derived from participating endpoints. */
  viewport: { x: number; width: number };
  carrier: Omit<CompositeCarrier, "datasets"> & { datasets: Array<{ id: string; result: EncodedResult }> };
}
export type CompositeArtifact = CompositeReadbackArtifact | CompositeMetricArtifact;

/** Artifact-only observers. No selection, rows, evaluator or source declaration. */
export function decodeCompositeReadback(artifact: CompositeReadbackArtifact): CompositeCarrier {
  if (artifact.kind !== "composite-readback" || artifact.carrier.version !== 1) throw new Error("unsupported composite readback version");
  return structuredClone(artifact.carrier);
}
export function decodeCompositeMetric(artifact: CompositeMetricArtifact): CompositeCarrier {
  if (artifact.kind !== "composite-metric" || artifact.carrier.version !== 1) throw new Error("unsupported composite metric version");
  if (!Number.isFinite(artifact.scale.origin) || !Number.isFinite(artifact.scale.unitsPerValue) || artifact.scale.unitsPerValue <= 0) throw new Error("invalid metric scale");
  const { datasets, ...rest } = structuredClone(artifact.carrier);
  return { ...rest, datasets: datasets.map(({ id, result }) => ({ id, result: {
    ...result,
    observations: result.observations.map(({ key, text, positions }) => ({ key, values: {
      ...text, ...Object.fromEntries(Object.entries(positions).map(([field, x]) => {
        if (typeof x !== "number" || !Number.isFinite(x)) throw new Error("invalid metric coordinate");
        const value = (x - artifact.scale.origin) / artifact.scale.unitsPerValue;
        if (!Number.isFinite(value)) throw new Error("unrecoverable metric coordinate");
        return [field, value];
      })),
    } })),
  } })) };
}

export const carriedParts = (c: CarriedComposite): CarriedPart[] => c.combinator === "embed" ? [c.part] : c.parts;
export function carriedViews(c: CarriedComposite): CarriedView[] {
  return carriedParts(c).flatMap(p => p.kind === "qualified" ? [p] : carriedViews(p.composite));
}
