import type { ComponentIR } from "../ir.js";
import type { NativeStyleRuleIR } from "../native-style-rules.js";

export interface NativeLoopVisualPlan {
  operation: "loop-visual";
  targetPart: string;
  durationMs: number;
  multiplier: number;
  easing: [number, number, number, number];
  reducedValue: number;
  sizeAxis: string;
  thicknessAxis: string;
  sizePixels: Record<string, number>;
  thicknessPixels: Record<string, number>;
  baseThicknessPx: number;
  trackColor: string;
  accentColor: string;
  hiddenProp?: string;
  labelProp?: string;
  excluded: string[];
}

const px = (value: string): number | undefined => {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value);
  return match ? Number(match[1]) : undefined;
};
const color = (value: string): boolean => /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value);
// Web's 1em box is supplied by the native size axis. Its display/box-sizing
// mechanics have no direct native property; the authored border remains the
// visual source even where its CSS literal carries a Web platform annotation.
const visible = (rule: NativeStyleRuleIR) => rule.declarations.filter(decl =>
  !(decl.platforms?.every(platform => platform === "web") &&
    ["display", "width", "height", "box-sizing"].includes(decl.property)));

/** One authored rotation loop plus its native ring carriers. This selects by
 * normalized facts, so renaming the component leaves the plan unchanged. */
export function nativeLoopVisualPlan(ir: ComponentIR): NativeLoopVisualPlan | undefined {
  if (!ir.motion.loops.length) return undefined;
  // A separate motion family may carry a loop but no painted border. Leave it
  // to that target's other shape planner, which receipts any unlowered motion.
  const candidateTarget = ir.motion.loops[0]?.target.name;
  const ringCandidate = ir.nativeStyleRules?.rules.some(rule => rule.part === candidateTarget &&
    rule.declarations.some(decl => decl.property === "border-top-color" || decl.property === "border-color" || decl.property === "border-style"));
  if (!ringCandidate) return undefined;
  function fail(reason: string): never { throw new Error(`NATIVE_UNSUPPORTED_LOOP_VISUAL: ${ir.name}: ${reason}`); }
  if (ir.motion.loops.length !== 1 || ir.motion.sequence || ir.interaction || ir.formControl || ir.surface || ir.compoundParts.length || ir.behavior.normalizedChannels.length)
    fail("loop host must be a passive single-loop visual");
  const loop = ir.motion.loops[0]!;
  const frames = loop.effect.keyframes;
  if (loop.driver !== "repeat" || loop.effect.kind !== "rotation" || frames.length !== 2 ||
      frames[0]?.offset !== 0 || frames[0].value !== 0 || frames[1]?.offset !== 1 || frames[1].value !== 360)
    fail("only a declared full-turn repeat rotation is supported");
  const duration = loop.timing.duration.rawValue?.match(/^(\d+(?:\.\d+)?)(ms|s)$/);
  const easing = loop.timing.easing;
  if (!duration || !("cubicBezier" in easing)) fail("duration and easing must be explicit native scalars");
  const durationMs = Number(duration[1]) * (duration[2] === "s" ? 1000 : 1);
  if (!Number.isFinite(durationMs) || durationMs <= 0) fail("duration must be positive");
  const root = ir.dom;
  const visual = root?.children.find(node => node.part === loop.target.name);
  if (!root || !visual || root.children.length !== 1 || visual.children.length || visual.componentRef || visual.iconGlyph ||
      root.componentRef || root.content || root.iteration || visual.content || visual.iteration ||
      Object.keys(root.attrs).length || Object.keys(visual.bindings).length || Object.keys(visual.events).length ||
      Object.keys(visual.propertyBindings).length || Object.keys(visual.attrs).sort().join() !== "aria-hidden" || visual.attrs["aria-hidden"] !== "true")
    fail("anatomy must contain one owned decorative visual child");
  const hidden = root.bindings["aria-hidden"];
  const label = root.bindings["aria-label"];
  if (Object.keys(root.bindings).some(key => key !== "aria-hidden" && key !== "aria-label") ||
      (hidden && (hidden.kind !== "prop" || hidden.path?.length)) ||
      (label && (label.kind !== "prop" || label.path?.length)))
    fail("accessibility bindings are not supported by the native visual");
  const hiddenProp = hidden?.kind === "prop" ? hidden.prop : undefined;
  const labelProp = label?.kind === "prop" ? label.prop : undefined;
  if (hiddenProp && ir.styledProps.find(prop => prop.name === hiddenProp)?.propType.kind !== "boolean") fail("hidden binding must target a Boolean prop");
  if (labelProp && ir.styledProps.find(prop => prop.name === labelProp)?.propType.kind !== "string") fail("label binding must target a string prop");
  if (ir.nativeStyleRules?.unsupported.length) fail("unlowered native style selector");
  const rules = ir.nativeStyleRules?.rules.filter(rule => !["tokens", "structure"].includes(rule.sourceKey)) ?? [];
  const base = rules.find(rule => rule.part === loop.target.name && !rule.predicates.length && !rule.pseudo);
  const declarations = new Map(visible(base ?? { sourceKey: "", part: "", predicates: [], declarations: [] }).map(decl => [decl.property, decl.value]));
  const allowedBase = new Set(["border-radius", "border-style", "border-width", "border-color", "border-top-color"]);
  if (!base || [...declarations.keys()].some(key => !allowedBase.has(key)) || declarations.get("border-radius") !== "50%" ||
      declarations.get("border-style") !== "solid" || !color(declarations.get("border-color") ?? "") || !color(declarations.get("border-top-color") ?? ""))
    fail("ring style requires circular solid borders and authored track/accent colors");
  const baseThicknessPx = px(declarations.get("border-width") ?? "");
  if (baseThicknessPx === undefined || baseThicknessPx <= 0) fail("base border width must be positive pixels");
  let sizeAxis = "";
  let thicknessAxis = "";
  const sizePixels: Record<string, number> = {};
  const thicknessPixels: Record<string, number> = {};
  for (const rule of rules) {
    if (rule === base) continue;
    const current = visible(rule).filter(decl => !decl.property.includes("."));
    if (!current.length) continue;
    if (rule.sourceKey === "root" && rule.part === (root.part ?? "root") && !rule.predicates.length && !rule.pseudo &&
        current.length === 1 && current[0]?.property === "transition-duration" && current[0].value === loop.timing.duration.rawValue) continue;
    const predicate = rule.predicates.length === 1 && rule.predicates[0]?.kind === "variant" ? rule.predicates[0] : undefined;
    if (!predicate || rule.pseudo || current.length !== 1) fail(`unhandled style rule ${rule.sourceKey}`);
    const value = px(current[0]!.value);
    if (value === undefined || value <= 0) fail(`invalid variant scalar ${rule.sourceKey}`);
    if (rule.part === (root.part ?? "root") && current[0]!.property === "font-size") {
      if (sizeAxis && sizeAxis !== predicate.axis) fail("multiple size axes");
      sizeAxis = predicate.axis;
      sizePixels[predicate.value] = value;
    } else if (rule.part === loop.target.name && current[0]!.property === "border-width") {
      if (thicknessAxis && thicknessAxis !== predicate.axis) fail("multiple thickness axes");
      thicknessAxis = predicate.axis;
      thicknessPixels[predicate.value] = value;
    } else fail(`unhandled variant rule ${rule.sourceKey}`);
  }
  if (!sizeAxis || !thicknessAxis || Object.keys(sizePixels).sort().join() !== [...(ir.variants[sizeAxis] ?? [])].sort().join() ||
      Object.keys(thicknessPixels).sort().join() !== [...(ir.variants[thicknessAxis] ?? [])].sort().join())
    fail("size and thickness carriers must cover their declared axes");
  const realized = new Set([sizeAxis, thicknessAxis, hiddenProp, labelProp]);
  const excluded = ir.styledProps.map(prop => prop.name).filter(name => !realized.has(name));
  return { operation: "loop-visual", targetPart: loop.target.name, durationMs, multiplier: loop.timing.multiplier,
    easing: easing.cubicBezier, reducedValue: loop.reducedMotion.value, sizeAxis, thicknessAxis,
    sizePixels, thicknessPixels, baseThicknessPx, trackColor: declarations.get("border-color")!,
    accentColor: declarations.get("border-top-color")!, hiddenProp, labelProp, excluded };
}
