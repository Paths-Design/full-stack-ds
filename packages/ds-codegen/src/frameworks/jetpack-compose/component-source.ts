/**
 * Jetpack Compose composable emission — the dispatcher.
 *
 * Classification lives in the shared native substrate
 * (../native-emission-class.ts) and the emitter-local predicates exported
 * from ./emitters/content.ts; per-family Kotlin lowering lives in
 * ./emitters/{action,content,controls,composites,surfaces}.ts; shared
 * chrome/token-slot mechanics in ./chrome.ts; component-reference lowering
 * in ./references.ts; identifier grammar in ./kotlin/. This file owns only
 * the dispatch ORDER — which class wins when shapes overlap — and the
 * public generator surface.
 *
 * Dispatch precedence (mirroring the swift dispatcher): declared collapse
 * intents own their realization ahead of structural classes; the highlight
 * content transform ahead of everything; then the structural classes in
 * the order below; a component matching no class throws by design.
 *
 * Facts derive from the ComponentIR throughout: channel param names from
 * `behavior.normalizedChannels`, the size axis from `styledProps` ∩
 * `definedTypes`, boolean/string passthroughs from the remaining styled
 * props. Framework-grammar tables (dp dimensions per size value, mirrored
 * from the hand-authored golden prototype `__golden__/Switch/
 * Switch.compose.kt` with its line-67 `??` defect corrected to the Kotlin
 * elvis operator) live in ./kotlin/grammar.ts.
 */
import { emitNativeToggleCollapse, emitProjectedChildrenAction } from "./emitters/action.js";
import { emitBareRuleLeaf, emitExpandableContent, emitGlyphHost, emitIconDecoratedContent, emitProgressIndicator, emitPropTextLeaf, emitStaticContent, isExpandableContent, isProgressIndicator, isPropTextLeaf } from "./emitters/content.js";
import { emitBooleanControl, emitCountFieldGroup, emitLabeledTextControl, emitRadioGroup, emitSelectionControl, emitTextControl } from "./emitters/controls.js";
import { emitCompoundPartComposer, emitDisclosureComponent, emitInteractiveComposite, emitMediaLeaf, emitNamedSlotComposer, emitPassiveTreeItem, emitReferencedActionComposite, emitReferencedContentComposite } from "./emitters/composites.js";
import { emitCenteredSurface, emitCoachmarkSurface, emitDateGridSurface, emitTransferSurface, emitViewportEdgeSurface } from "./emitters/surfaces.js";
import { collectCollapseIntents, collectContentTransforms } from "../../ir.js";
import type { ComponentIR } from "../../ir.js";
import { emitComposeHighlightComponent } from "./highlight-source.js";
import { withKotlinMessages } from "./messages.js";
import { isBareRuleLeaf, isCenteredSurface, isCoachmarkSurface, isCompoundPartComposer, isCountIteratedFieldGroup, isDateGridSurface, isGlyphHost, isIconDecoratedContent, isInteractiveComposite, isLabeledTextControl, isMediaLeaf, isNamedSlotComposer, isPassiveTreeItem, isProjectedChildrenAction, isReferencedActionComposite, isReferencedContentComposite, isSelectionControl, isStaticContent, isTransferSurface, isValueChannelControl, isViewportEdgeSurface, radioGroupFacts, soleValueChannel } from "../native-emission-class.js";

export function generateJetpackComposeComponentSource(ir: ComponentIR): string {
  return withKotlinMessages(emitJetpackComposeComponentSource(ir));
}

function emitJetpackComposeComponentSource(
  ir: ComponentIR,
): string {
  const highlight = collectContentTransforms(ir.dom).find((content) => content.transform === "highlight");
  if (highlight?.linePart && highlight.gutterPart) return emitComposeHighlightComponent(ir, highlight);
  // Collapse intents dispatch FIRST, mirroring the swift dispatcher's
  // precedence: a contract that declares a native collapse owns its
  // realization even if its dom shape would also match a control class.
  if (collectCollapseIntents(ir).has("native-toggle-affordance")) {
    const collapseChannel = ir.behavior.normalizedChannels[0];
    if (!collapseChannel || collapseChannel.valueType !== "boolean") {
      throw new Error(
        `generateJetpackComposeComponentSource: ${ir.name} declares native-toggle-affordance without a boolean value channel`,
      );
    }
    return emitNativeToggleCollapse(ir, collapseChannel);
  }
  if (collectCollapseIntents(ir).has("native-disclosure")) {
    return emitDisclosureComponent(ir);
  }
  if (isReferencedContentComposite(ir)) {
    return emitReferencedContentComposite(ir);
  }
  if (isMediaLeaf(ir)) {
    return emitMediaLeaf(ir);
  }
  if (isCompoundPartComposer(ir)) {
    return emitCompoundPartComposer(ir);
  }
  if (isPassiveTreeItem(ir)) {
    return emitPassiveTreeItem(ir);
  }
  if (isNamedSlotComposer(ir)) {
    return emitNamedSlotComposer(ir);
  }
  if (isReferencedActionComposite(ir)) {
    return emitReferencedActionComposite(ir);
  }
  if (isDateGridSurface(ir)) {
    return emitDateGridSurface(ir);
  }
  if (isTransferSurface(ir)) {
    return emitTransferSurface(ir);
  }
  if (radioGroupFacts(ir)) {
    return emitRadioGroup(ir, radioGroupFacts(ir)!);
  }
  if (isInteractiveComposite(ir)) {
    return emitInteractiveComposite(ir);
  }
  if (isCountIteratedFieldGroup(ir)) {
    return emitCountFieldGroup(ir);
  }
  if (isLabeledTextControl(ir)) {
    return emitLabeledTextControl(ir);
  }
  if (isSelectionControl(ir)) {
    return emitSelectionControl(ir);
  }
  if (isCoachmarkSurface(ir)) {
    return emitCoachmarkSurface(ir);
  }
  if (isCenteredSurface(ir)) {
    return emitCenteredSurface(ir);
  }
  if (isViewportEdgeSurface(ir)) {
    return emitViewportEdgeSurface(ir);
  }
  if (isProjectedChildrenAction(ir)) {
    return emitProjectedChildrenAction(ir);
  }
  if (isValueChannelControl(ir)) {
    const channel = soleValueChannel(ir)!;
    if (channel.valueType === "boolean") {
      return emitBooleanControl(ir, channel);
    }
    return emitTextControl(ir, channel);
  }
  if (isGlyphHost(ir)) {
    return emitGlyphHost(ir);
  }
  if (isIconDecoratedContent(ir)) {
    return emitIconDecoratedContent(ir);
  }
  if (isPropTextLeaf(ir)) {
    return emitPropTextLeaf(ir);
  }
  if (isExpandableContent(ir)) {
    return emitExpandableContent(ir);
  }
  if (isProgressIndicator(ir)) {
    return emitProgressIndicator(ir);
  }
  if (isBareRuleLeaf(ir)) {
    return emitBareRuleLeaf(ir);
  }
  if (isStaticContent(ir)) {
    return emitStaticContent(ir);
  }
  throw new Error(
    `generateJetpackComposeComponentSource: no emission class matches component "${ir.name}" on jetpack-compose — ` +
      `multi-part anatomy, surfaces, and other collapse classes throw by design until their slices land.`,
  );
}

// Public API stability: factory.ts and surface-emit.ts import the tokens-file
// generator through this module's path — re-export keeps that surface unchanged.
export { generateJetpackComposeTokensFile } from "./tokens-file.js";
