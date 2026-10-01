import { I18nManager, View } from "react-native";

type BudgetProgressProps = {
  effect: "elapsed-width" | "elapsed-ring";
  elapsed: number;
  reducedMotion: boolean;
  steps: number;
  width: number;
  height: number;
  thickness: number;
  color: string;
  trackColor: string;
  testID?: string;
};

/** A decorative projection of an existing budget, with no clock or completion
 * callback. Dimensions and paint are supplied by the component's token bindings.
 * Two clipped native border arcs avoid a separate SVG dependency for the ring.
 */
export function BudgetProgress({ effect, elapsed, reducedMotion, steps, width, height, thickness, color, trackColor, testID }: BudgetProgressProps) {
  if (![width, height, thickness].every(value => Number.isFinite(value) && value > 0)) throw new Error("Budget progress requires positive finite dimensions.");
  if (!Number.isInteger(steps) || steps < 2 || steps > 20) throw new Error("Budget progress requires between 2 and 20 reduced-motion steps.");
  const bounded = Number.isFinite(elapsed) ? Math.max(0, Math.min(1, elapsed)) : 0;
  const fraction = reducedMotion ? Math.floor(bounded * steps) / steps : bounded;
  const diameter = Math.min(width, height);
  const radius = diameter / 2;
  const borderWidth = Math.min(thickness, radius);
  return <View testID={testID} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width, height, direction: "ltr", alignItems: "center", justifyContent: "center" }}>
    {effect === "elapsed-width" ? <View style={{ width, height, borderRadius: height / 2, overflow: "hidden", backgroundColor: trackColor }}>
      <View style={{ width: width * fraction, height, backgroundColor: color, alignSelf: I18nManager.isRTL ? "flex-end" : "flex-start" }} />
    </View> : <View style={{ width: diameter, height: diameter }}>
      <View style={{ position: "absolute", width: diameter, height: diameter, borderRadius: radius, borderWidth, borderColor: trackColor }} />
      {[0, 1].map(half => <View key={half} style={{ position: "absolute", left: half === 0 ? radius : 0, width: radius, height: diameter, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: half === 0 ? -radius : 0, width: diameter, height: diameter,
          transform: [{ rotate: `${half === 0 ? Math.min(fraction, 0.5) * 360 - 180 : Math.max(fraction - 0.5, 0) * 360}deg` }] }}>
          <View style={{ position: "absolute", left: radius, width: radius, height: diameter, overflow: "hidden" }}>
            <View style={{ position: "absolute", left: -radius, width: diameter, height: diameter, borderRadius: radius, borderWidth, borderColor: color }} />
          </View>
        </View>
      </View>)}
    </View>}
  </View>;
}
