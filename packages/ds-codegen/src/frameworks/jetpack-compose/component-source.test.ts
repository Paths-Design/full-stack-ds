import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../../ir.js";
import { generateJetpackComposeComponentSource, generateJetpackComposeTokensFile } from "./component-source.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function repoRoot(): string {
  return resolve(__dirname, "../../../../..");
}

/** Load a real corpus contract + sidecars exactly like the swift tests. */
function loadContract(name: string): unknown {
  const folder = resolve(repoRoot(), "packages/ds-contracts/components", name);
  const contract = JSON.parse(
    readFileSync(resolve(folder, `${name}.contract.json`), "utf8"),
  );
  const tokensPath = resolve(folder, `${name}.tokens.json`);
  if (existsSync(tokensPath)) {
    contract.tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
  }
  const stylesPath = resolve(folder, `${name}.styles.json`);
  if (existsSync(stylesPath)) {
    contract.styles = JSON.parse(readFileSync(stylesPath, "utf8"));
  }
  return contract;
}

const irFor = (name: string) =>
  buildComponentIR(loadContract(name) as Parameters<typeof buildComponentIR>[0]);

describe("Compose direct token bindings", () => {
  it("preserves independent padding edges in projected-content controls", () => {
    const source = generateJetpackComposeComponentSource(irFor("Button"));
    const tokens = generateJetpackComposeTokensFile(irFor("Button"));
    for (const edge of ["inline-start", "inline-end", "block-start", "block-end"]) {
      expect(source).toContain(`layeredSlot("box-model.padding-${edge}")`);
      expect(tokens).toContain(`name = "box-model.padding-${edge}"`);
    }
    expect(source).toContain("PaddingValues(start = paddingInlineStart, top = paddingBlockStart, end = paddingInlineEnd, bottom = paddingBlockEnd)");
  });
  it.each(["Switch", "ToggleSwitch"])("keeps %s direct state lookups and their authored fallbacks", name => {
    const source = generateJetpackComposeComponentSource(irFor(name));
    const tokens = generateJetpackComposeTokensFile(irFor(name));
    const reads = [...source.matchAll(/TokenScopes\["([^"]+)"\]\?\.get\("([^"]+)"\)/g)];
    expect(reads.length).toBeGreaterThan(0);
    for (const [, scope, slot] of reads) {
      const block = tokens.split(`"${scope}" to mapOf(`)[1]?.split("\n    ),")[0] ?? "";
      expect(block, `${scope}: ${slot}`).toContain(`"${slot}" to ComponentTokenDefinition(`);
    }
    expect(tokens).toContain('fallback = "4px"');
    expect(tokens).not.toContain('name = "box-model.gap"');
  });
});

describe("generateJetpackComposeComponentSource — static-content path", () => {
  it("emits a composable with a content lambda and theme chrome for a static root (Text)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Text"));
    expect(src).toContain("@Composable");
    expect(src).toContain("fun Text(");
    expect(src).toContain("content: @Composable () -> Unit,");
    expect(src).toContain("val fsdsTheme = LocalFsdsTheme.current");
    expect(src).toContain("fun layeredSlot(slotName: String): String?");
    // Text carries the element prop, so the box appends the heading modifier.
    expect(src).toContain(
      "Box(modifier.then(chromeModifier).then(headingModifier)) { content() }",
    );
    // Variant scopes participate in layered resolution, root last.
    expect(src).toContain('"variant_" + variant.name.lowercase()');
    expect(src).toContain('"root"');
  });

  it("emits slot-existence-gated chrome: no dead lookups, no unused vals", () => {
    // Text has no background slot and no radius slot: no containerColor val,
    // no shape/clip, no empty-key layeredSlot calls anywhere.
    const text = generateJetpackComposeComponentSource(irFor("Text"));
    expect(text).not.toContain('layeredSlot("")');
    expect(text).not.toContain('get("")');
    expect(text).not.toContain("containerColor");
    expect(text).not.toContain("RoundedCornerShape");
    expect(text).not.toContain(".clip(");
    // Status carries background + foreground: both resolved, no empty keys.
    const status = generateJetpackComposeComponentSource(irFor("Status"));
    expect(status).toContain('layeredSlot("status.color.background.default")');
    expect(status).toContain('layeredSlot("status.color.foreground.primary")');
    expect(status).not.toContain('layeredSlot("")');
  });

  it("provides the resolved foreground through LocalFsdsContentColor when a foreground slot exists", () => {
    const text = generateJetpackComposeComponentSource(irFor("Text"));
    expect(text).toContain("import com.fullstackds.tokens.LocalFsdsContentColor");
    expect(text).toContain(
      "CompositionLocalProvider(LocalFsdsContentColor provides (contentColor ?: Color.Unspecified))",
    );
    // Skeleton is the decorative box: no foreground slot, no provider.
    const skeleton = generateJetpackComposeComponentSource(irFor("Skeleton"));
    expect(skeleton).not.toContain("LocalFsdsContentColor");
  });

  it("places modifier as the first optional parameter (AOSP API guideline)", () => {
    for (const name of ["Text", "Status", "List", "Skeleton"]) {
      const src = generateJetpackComposeComponentSource(irFor(name));
      const modifierIdx = src.indexOf("modifier: Modifier = Modifier,");
      expect(modifierIdx).toBeGreaterThan(-1);
      expect(modifierIdx).toBeLessThan(src.indexOf("content: @Composable () -> Unit,"));
      // modifier precedes every axis enum parameter
      for (const axis of Object.keys(irFor(name).variants ?? {})) {
        const axisParam = src.indexOf(`${axis}: `);
        if (axisParam !== -1) expect(modifierIdx).toBeLessThan(axisParam);
      }
    }
  });

  it("lowers the typography slots into a TextStyle for content-role roots (Text)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Text"));
    expect(src).toContain('layeredSlot("text.size.md")?.toFsdsSp()');
    // Weight axis lowers through the corpus value→slot vocabulary.
    expect(src).toContain('TextWeight.Normal -> "text.typography.fontWeight.regular"');
    expect(src).toContain('TextWeight.Semibold -> "text.typography.fontWeight.medium"');
    expect(src).toContain('TextWeight.Bold -> "text.typography.fontWeight.bold"');
    expect(src).toContain("?.toFsdsWeight()");
    expect(src).toContain(
      "val fsdsTextStyle = TextStyle(fontSize = fsdsFontSize ?: TextUnit.Unspecified, fontWeight = fsdsFontWeight ?: FontWeight.Normal)",
    );
    expect(src).toContain("ProvideFsdsTextStyle(fsdsTextStyle) {");
    // Non-typography static roots carry none of the machinery.
    const status = generateJetpackComposeComponentSource(irFor("Status"));
    expect(status).not.toContain("ProvideFsdsTextStyle");
    expect(status).not.toContain("TextStyle(");
  });

  it("lowers the element-tag union prop to a parameter plus heading semantics (Text's `as`)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Text"));
    expect(src).toContain("enum class TextElement { P, Span, Div, H1, H2, H3, H4, H5, H6 }");
    expect(src).toContain("`as`: TextElement = TextElement.P,");
    // All six heading values lower to the heading marker (the CMP 1.8.0
    // desktop semantics artifact has no Heading.Level class).
    expect(src.match(/-> Modifier\.semantics \{ heading\(\) \}/g)?.length).toBe(6);
    expect(src).toContain("Box(modifier.then(chromeModifier).then(headingModifier)) { content() }");
  });

  it("escapes Kotlin hard keywords as axis parameter names (List's `as` axis)", () => {
    const src = generateJetpackComposeComponentSource(irFor("List"));
    expect(src).toContain("`as`: ListAs");
    expect(src).toContain('"variant_" + `as`.name.lowercase()');
  });

  it("prefixes digit-leading enum entries (TextSize.2xl -> N2xl)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Text"));
    expect(src).toContain("enum class TextSize { Xs, Sm, Md, Lg, Xl, N2xl, N3xl }");
    // The default reference uses the same escaped member name.
    expect(src).toContain("TextSize.Xs");
  });

});

describe("generateJetpackComposeComponentSource — passive-leaf families", () => {
  it("emits a prop-text leaf as BasicText with the bound prop and font-size slot (CodeSnippet)", () => {
    const src = generateJetpackComposeComponentSource(irFor("CodeSnippet"));
    expect(src).toContain("import androidx.compose.foundation.text.BasicText");
    expect(src).toContain("text: String,");
    expect(src).toContain("BasicText(");
    expect(src).toContain("text = text,");
    expect(src).toContain('layeredSlot("code-snippet.size.fontSize.default")?.toFsdsSp()');
    expect(src).toContain(
      "val fsdsTextStyle = TextStyle(",
    );
    // No content lambda — the text is the bound prop.
    expect(src).not.toContain("content: @Composable () -> Unit,");
    // Markdown's content transform degrades to its source prop.
    const markdown = generateJetpackComposeComponentSource(irFor("Markdown"));
    expect(markdown).toContain("content: String,");
    expect(markdown).toContain("text = content,");
  });

  it("emits the expandable-content shape with the expanded channel and a wired toggle (Truncate)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Truncate"));
    expect(src).toContain("expanded: Boolean? = null,");
    expect(src).toContain("defaultExpanded: Boolean = false,");
    expect(src).toContain("onExpandedChange: ((Boolean) -> Unit)? = null,");
    expect(src).toContain("expandable: Boolean = false,");
    expect(src).toContain("collapseText: String? = null,");
    expect(src).toContain("expandText: String? = null,");
    // The toggle label comes from the IR conditional content (expanded →
    // collapseText, collapsed → expandText), not hardcoded labels.
    expect(src).toContain(
      "text = (if (resolvedExpanded) collapseText else expandText) ?: \"\",",
    );
    expect(src).toContain("onExpandedChange?.invoke(!resolvedExpanded)");
    expect(src).toContain("stateDescription = if (resolvedExpanded) \"expanded\" else \"collapsed\"");
    // Gated by the contract's expandable prop.
    expect(src).toContain("if (expandable) {");
  });

  it("emits a progressbar-role indicator with the 0-100 value and intent fill (Progress)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Progress"));
    expect(src).toContain("enum class ProgressVariant { Linear, Circular }");
    expect(src).toContain("value: Float? = null,");
    expect(src).toContain("FsdsProgressIndicator(");
    expect(src).toContain("progress = value?.let { it / 100f },");
    // Per-intent fill color resolves through the layered scopes.
    expect(src).toContain('ProgressIntent.Info -> "progress.color.fill.info"');
    expect(src).toContain('ProgressIntent.Danger -> "progress.color.fill.danger"');
    // No dead dim lookups: Progress has no spinner.size slots.
    expect(src).not.toContain("spinner.size.sm");
  });

  it("emits a status-role spinner with per-value size/thickness dim lookups (Spinner)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Spinner"));
    expect(src).toContain("enum class SpinnerSize { Xs, Sm, Md, Lg }");
    expect(src).toContain("linear = false,");
    expect(src).toContain('SpinnerSize.Md -> "spinner.size.md"');
    expect(src).toContain('SpinnerThickness.Regular -> "spinner.thickness.regular"');
    expect(src).toContain("FsdsProgressIndicator(");
  });
});

describe("generateJetpackComposeComponentSource — boolean-control class (FEAT-COMPOSE-ADMISSION-SUBSTRATE-01)", () => {
  it("lowers the boolean value channel onto the FsdsCheckbox substrate with controlled-state hoisting (Checkbox)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Checkbox"));
    // Channel param names come from the IR's normalized channel.
    expect(src).toContain("checked: Boolean? = null,");
    expect(src).toContain("defaultChecked: Boolean = false,");
    expect(src).toContain("onChange: ((Boolean) -> Unit)? = null,");
    // Controlled-takes-precedence uncontrolled fallback.
    expect(src).toContain("val resolvedChecked = checked ?: uncontrolledChecked");
    expect(src).toContain("if (checked == null) {");
    // The change-handler prop name comes from the contract channel.
    expect(src).toMatch(/\?\.invoke\(next\)/);
    // Foundation-only substrate: the painted control, never a material import.
    expect(src).toContain("FsdsCheckbox(");
    expect(src).toContain("FsdsCheckboxStyle(");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    // Modifier is the first optional parameter (AOSP guideline).
    expect(src.match(/fun Checkbox\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
    // Named divergence: the binary substrate does not lower indeterminate.
    expect(src).not.toContain("indeterminate");
  });

  it("keeps every root-scope read backed by a tokens-file definition (Checkbox)", () => {
    const source = generateJetpackComposeComponentSource(irFor("Checkbox"));
    const tokens = generateJetpackComposeTokensFile(irFor("Checkbox"));
    const reads = [...source.matchAll(/TokenScopes\["([^"]+)"\]\?\.get\("([^"]+)"\)/g)];
    expect(reads.length).toBeGreaterThanOrEqual(9);
    for (const [, scope, slot] of reads) {
      const block = tokens.split(`"${scope}" to mapOf(`)[1]?.split("\n    ),")[0] ?? "";
      expect(block, `${scope}: ${slot}`).toContain(`"${slot}" to ComponentTokenDefinition(`);
    }
    // box-model.gap is RN-consumed but deliberately unclaimed by this path.
    expect(tokens).not.toContain('name = "box-model.gap"');
  });

  it("dispatches on the structural class, not the component name", () => {
    const ir = irFor("Checkbox");
    const renamed = { ...ir, name: "RenamedControl" };
    const src = generateJetpackComposeComponentSource(renamed);
    expect(src).toContain("fun RenamedControl(");
    expect(src).toContain("FsdsCheckbox(");
    expect(src).toContain('["root"]?.get("checkbox.color.background.default")');
  });

  it("lowers the string value channel onto a foundation BasicTextField with input-part chrome (Input)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Input"));
    expect(src).toContain("value: String? = null,");
    expect(src).toContain("defaultValue: String = \"\",");
    expect(src).toContain("onChange: ((String) -> Unit)? = null,");
    expect(src).toContain("val resolvedValue = value ?: uncontrolledValue");
    expect(src).toContain("BasicTextField(");
    expect(src).toContain('fsdsTheme.resolve(inputTokenScopes["root"]?.get("input.color.bg.default"))?.toFsdsColor()');
    expect(src).toContain('fsdsTheme.resolve(inputTokenScopes["root"]?.get("input.typography.size.default"))?.toFsdsSp()');
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src).not.toContain("input.opacity.disabled");
    expect(src.match(/fun Input\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

  it("keeps the declared native-toggle collapse ahead of structural control classes", () => {
    // Switch declares native-toggle-affordance; the collapse must own the
    // realization even though its boolean channel would match the control class.
    const src = generateJetpackComposeComponentSource(irFor("Switch"));
    expect(src).toContain("FsdsToggle(");
    expect(src).not.toContain("FsdsCheckbox(");
  });
});

describe("generateJetpackComposeComponentSource — bare-rule-leaf class (FEAT-COMPOSE-ADMISSION-SUBSTRATE-01)", () => {
  it("lowers the hr root onto the FsdsRule substrate with the orientation axis (Divider)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Divider"));
    expect(src).toContain("enum class DividerOrientation { Horizontal, Vertical }");
    expect(src).toContain("DividerOrientation.Horizontal -> FsdsRuleOrientation.Horizontal");
    expect(src).toContain("DividerOrientation.Vertical -> FsdsRuleOrientation.Vertical");
    expect(src).toContain("decorative: Boolean = false,");
    expect(src).toContain("FsdsRuleStyle(");
    expect(src).toContain('["root"]?.get("divider.color.default")');
    expect(src).toContain('["root"]?.get("divider.size.thickness")');
    // Named divergences: thickness/title string props are omitted v1.
    expect(src).not.toContain("thickness: String");
    expect(src).not.toContain("title: String");
    // Modifier is the first optional parameter.
    expect(src.match(/fun Divider\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

  it("keeps every rule read backed by a tokens-file definition; gap stays unread (Divider)", () => {
    const source = generateJetpackComposeComponentSource(irFor("Divider"));
    const tokens = generateJetpackComposeTokensFile(irFor("Divider"));
    const reads = [...source.matchAll(/TokenScopes\["([^"]+)"\]\?\.get\("([^"]+)"\)/g)];
    // The test-env IR carries the sidecar's own slots (color + thickness);
    // the CLI additionally injects box-model primitive geometry, widening
    // the read set. The closure property below holds in both environments.
    expect(reads.length).toBeGreaterThanOrEqual(2);
    for (const [, scope, slot] of reads) {
      const block = tokens.split(`"${scope}" to mapOf(`)[1]?.split("\n    ),")[0] ?? "";
      expect(block, `${scope}: ${slot}`).toContain(`"${slot}" to ComponentTokenDefinition(`);
    }
    expect(tokens).not.toContain('name = "box-model.gap"');
  });
});

describe("generateJetpackComposeComponentSource — glyph classes (FEAT-COMPOSE-GLYPH-ADMISSION-01)", () => {
  it("lowers the iconGlyph fact onto the shared glyph registry with hint-driven sizes (Icon)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Icon"));
    expect(src).toContain("enum class IconSize { Sm, Md, Lg, Xl }");
    expect(src).toContain("size: IconSize = IconSize.Md,");
    // Token-scoped frame dims preferred, hint table fallback — the when
    // covers every hint member from the IR fact.
    expect(src).toContain('IconSize.Sm -> fsdsTheme.resolve(iconTokenScopes["root"]?.get("icon.size.sm"))?.toFsdsDp() ?: 16.dp');
    expect(src).toContain("FsdsGlyphIcon(");
    // Decorative-by-default semantics come from the catalog flags.
    expect(src).toContain("FsdsGlyphCatalog.decorativeDefaults.contains(name)");
    expect(src).toContain("Modifier.clearAndSetSemantics { }");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Icon\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

  it("emits the glyph catalog substrate from the iconography corpus", async () => {
    const { generateComposeGlyphCatalogFile } = await import("./icon-glyph.js");
    const catalog = generateComposeGlyphCatalogFile();
    expect(catalog).not.toBeNull();
    expect(catalog!.relativePath).toBe("../glyph/FsdsGlyphCatalog.kt");
    expect(catalog!.contents).toContain("object FsdsGlyphCatalog {");
    expect(catalog!.contents).toContain("FsdsSvgPath.parse(stroke.d)");
    // Kotlin literals escape dollars so path data cannot interpolate.
    expect(catalog!.contents).not.toMatch(/[^\\]\$/);
  });

  it("lowers the ReactNode icon region beside one content region with variant-layered chrome (Alert)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Alert"));
    expect(src).toContain("icon: (@Composable () -> Unit)? = null,");
    expect(src).toContain("content: @Composable () -> Unit,");
    expect(src).toContain("enum class AlertIntent { Info, Success, Warning, Danger }");
    // Nullable axes contribute a layer only when set.
    expect(src).toContain(
      'if (intent != null) "variant_" + intent.name.lowercase() else null',
    );
    expect(src).toContain('layeredSlot("alert.color.background.primary")');
    expect(src).toContain("Arrangement.spacedBy(gap)");
    expect(src).toContain("LocalFsdsContentColor provides (contentColor ?: Color.Unspecified)");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
  });

  it("maps member-named variant slots including the error-to-danger family closure (AlertNotice)", () => {
    const src = generateJetpackComposeComponentSource(irFor("AlertNotice"));
    // Exact name-grammar members.
    expect(src).toContain(
      'AlertNoticeStatus.Info -> fsdsTheme.resolve(alertNoticeTokenScopes["root"]?.get("alert-notice.color.background.info"))',
    );
    // The sole unmatched member binds the sole unassigned family slot.
    expect(src).toContain(
      'AlertNoticeStatus.Error -> fsdsTheme.resolve(alertNoticeTokenScopes["root"]?.get("alert-notice.color.background.danger"))',
    );
    const tokens = generateJetpackComposeTokensFile(irFor("AlertNotice"));
    const reads = [...src.matchAll(/TokenScopes\["([^"]+)"\]\?\.get\("([^"]+)"\)/g)];
    expect(reads.length).toBeGreaterThanOrEqual(10);
    for (const [, scope, slot] of reads) {
      const block = tokens.split(`"${scope}" to mapOf(`)[1]?.split("\n    ),")[0] ?? "";
      expect(block, `${scope}: ${slot}`).toContain(`"${slot}" to ComponentTokenDefinition(`);
    }
    expect(tokens).not.toContain('name = "box-model.gap"');
  });
});

describe("generateJetpackComposeComponentSource — disclosure class (FEAT-COMPOSE-DISCLOSURE-01)", () => {
  it("lowers native-disclosure onto a toggleable header with animated content (Details)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Details"));
    expect(src).toContain("open: Boolean? = null,");
    expect(src).toContain("val resolvedOpen = open ?: uncontrolledOpen");
    expect(src).toContain("onOpenChange?.invoke(next)");
    expect(src).toContain("summary: String? = null,");
    expect(src).toContain("AnimatedVisibility(visible = resolvedOpen)");
    expect(src).toContain("role = Role.Button,");
    expect(src).toContain('stateDescription = if (resolvedOpen) "expanded" else "collapsed"');
    expect(src).toContain('layeredSlot("details.color.background.default")');
    // Consumer content inherits the foreground through the local.
    expect(src).toContain("LocalFsdsContentColor provides (contentColor ?: Color.Unspecified)");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Details\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

});

describe("generateJetpackComposeComponentSource — radio-collection class (FEAT-COMPOSE-RADIO-ADMISSION-01)", () => {
  it("lowers the shared radio facts onto selectable rows (RadioGroup)", () => {
    const src = generateJetpackComposeComponentSource(irFor("RadioGroup"));
    // Option data class lowered from the contract alias.
    expect(src).toContain("data class RadioGroupOption(");
    expect(src).toContain("val value: String,");
    expect(src).toContain("val label: String,");
    // Channel trio + controlled-takes-precedence.
    expect(src).toContain("value: String? = null,");
    expect(src).toContain("val resolvedValue = value ?: uncontrolledValue");
    expect(src).toContain("onChange?.invoke(item.value)");
    // One selectable row per option with radio semantics.
    expect(src).toContain("role = Role.RadioButton,");
    expect(src).toContain("selected = selected,");
    expect(src).toContain("if (orientation == RadioGroupOrientation.Horizontal)");
    expect(src).toContain("Arrangement.spacedBy(groupGap, Alignment.CenterHorizontally)");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun RadioGroup\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

  it("keeps every radio read backed by a tokens-file definition (RadioGroup)", () => {
    const source = generateJetpackComposeComponentSource(irFor("RadioGroup"));
    const tokens = generateJetpackComposeTokensFile(irFor("RadioGroup"));
    const reads = [...source.matchAll(/TokenScopes\["([^"]+)"\]\?\.get\("([^"]+)"\)/g)];
    for (const [, scope, slot] of reads) {
      const block = tokens.split(`"${scope}" to mapOf(`)[1]?.split("\n    ),")[0] ?? "";
      expect(block, `${scope}: ${slot}`).toContain(`"${slot}" to ComponentTokenDefinition(`);
    }
  });
});

describe("generateJetpackComposeComponentSource — array-iterated list class (FEAT-COMPOSE-SHUTTLE-ADMISSION-01)", () => {
  it("lowers the array channel onto removable rows (Shuttle)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Shuttle"));
    expect(src).toContain("value: List<String>? = null,");
    expect(src).toContain("defaultValue: List<String> = emptyList(),");
    expect(src).toContain("val resolvedValue = value ?: uncontrolledValue");
    expect(src).toContain("resolvedValue.forEach { item ->");
    expect(src).toContain("val next = resolvedValue.filter { it != item }");
    // The change-handler prop name comes from the contract channel.
    expect(src).toMatch(/\?\.invoke\(next\)/);
    expect(src).toContain('layeredSlot("shuttle.color.background.default")');
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Shuttle\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });
});

describe("generateJetpackComposeComponentSource — interactive-composite class (FEAT-COMPOSE-INTERACTIVE-COMPOSITE-01)", () => {
  it("lowers the union openness channel to a compound context (Accordion)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Accordion"));
    expect(src).toContain("class AccordionState(");
    expect(src).toContain("val value: List<String>,");
    expect(src).toContain("val onToggle: (String) -> Unit,");
    expect(src).toContain("val LocalAccordionState = compositionLocalOf<AccordionState?> { null }");
    expect(src).toContain("value: List<String>? = null,");
    expect(src).toContain("fun AccordionTrigger(");
    expect(src).toContain("fun AccordionContent(");
    expect(src).toContain("state.value.contains(key)");
    expect(src).toContain('error("AccordionTrigger must be used inside Accordion")');
    expect(src).not.toMatch(/import androidx\.compose\.material/);
  });

  it("lowers the scalar activeTab channel to a compound context (Tabs)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Tabs"));
    expect(src).toContain("class TabsState(");
    expect(src).toContain("val value: String,");
    expect(src).toContain("val onSelect: (String) -> Unit,");
    expect(src).toContain("value: String? = null,");
    expect(src).toContain("fun TabsTab(");
    expect(src).toContain("fun TabsPanel(");
    expect(src).toContain("state.value == key");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
  });
});

describe("generateJetpackComposeComponentSource — count-iterated field group (FEAT-COMPOSE-OTP-ADMISSION-01)", () => {
  it("distributes the string channel over length per-slot fields (OTP)", () => {
    const src = generateJetpackComposeComponentSource(irFor("OTP"));
    expect(src).toContain("value: String? = null,");
    expect(src).toContain("defaultValue: String = \"\",");
    expect(src).toContain("length: Int = 6,");
    expect(src).toContain("val resolvedValue = value ?: uncontrolledValue");
    expect(src).toContain("repeat(length) { index ->");
    expect(src).toContain("BasicTextField(");
    expect(src).toContain("resolvedValue.padEnd(length, ' ').toCharArray()");
    expect(src).toContain('layeredSlot("otp.color.background.default")');
    expect(src).toContain('layeredSlot("otp.size.radius.default")');
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun OTP\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });
});

describe("generateJetpackComposeComponentSource — labeled text control (FEAT-COMPOSE-TEXTFIELD-ADMISSION-01)", () => {
  it("wraps the string channel with label/description/error regions (TextField)", () => {
    const src = generateJetpackComposeComponentSource(irFor("TextField"));
    expect(src).toContain("value: String? = null,");
    expect(src).toContain("defaultValue: String = \"\",");
    expect(src).toContain("label: (@Composable () -> Unit)? = null,");
    expect(src).toContain("error: (@Composable () -> Unit)? = null,");
    expect(src).toContain("invalid: Boolean = false,");
    expect(src).toContain("BasicTextField(");
    expect(src).toContain('layeredSlot("text-field.border.radius")');
    expect(src).toContain("if (invalid) region()");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun TextField\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });
});

describe("generateJetpackComposeComponentSource — selection control (FEAT-COMPOSE-SELECT-ADMISSION-01)", () => {
  it("lowers the union selection channel onto a Popup option list (Select)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Select"));
    expect(src).toContain("data class SelectOption(");
    expect(src).toContain("options: List<SelectOption> = emptyList(),");
    expect(src).toContain("value: String? = null,");
    expect(src).toContain("multiple: Boolean = false,");
    expect(src).toContain("values: List<String>? = null,");
    expect(src).toContain("open: Boolean? = null,");
    expect(src).toContain("Popup(onDismissRequest = {");
    expect(src).toContain("role = Role.RadioButton,");
    expect(src).toContain('layeredSlot("select.color.background.default")');
    expect(src).toContain('layeredSlot("select.size.radius.default")');
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Select\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });
});

describe("generateJetpackComposeComponentSource — named-slot composer (FEAT-COMPOSE-FIELD-ADMISSION-01)", () => {
  it("lowers each declared slot to a null-safe content region in document order (Field)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Field"));
    expect(src).toContain("enum class FieldStatus { Idle, Validating, Valid, Invalid }");
    for (const slot of ["label", "control", "help", "error", "validatingIndicator"]) {
      expect(src).toContain(`${slot}: (@Composable () -> Unit)? = null,`);
    }
    // Regions render in the dom's declared order, and the two text regions
    // carry their declared typography through the content text-style local.
    const order = ["label", "control", "help", "error", "validatingIndicator"].map((s) => src.indexOf(`${s}?.invoke()`));
    expect(order.every((index, i) => index > 0 && (i === 0 || index > order[i - 1]!))).toBe(true);
    expect(src).toContain("LocalFsdsTextStyle provides TextStyle(fontSize = fieldLabelSize, color = fieldLabelColor ?: Color.Unspecified)");
    expect(src).toContain("LocalFsdsTextStyle provides TextStyle(color = fieldInvalidText ?: Color.Unspecified)");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Field\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

  it("keeps the field token set closed and names the slots it does not claim (Field)", () => {
    const source = generateJetpackComposeComponentSource(irFor("Field"));
    const tokens = generateJetpackComposeTokensFile(irFor("Field"));
    for (const slot of [
      "field.color.fg", "field.color.invalid-text",
      "field.label.color", "field.label.fontSize", "field.gap.y", "field.gap.meta",
      "box-model.gap",
    ]) {
      expect(source).toContain(`layeredSlot(${JSON.stringify(slot)})`);
      expect(tokens).toContain(`name = ${JSON.stringify(slot)}`);
    }
    const reads = [...source.matchAll(/layeredSlot\("([^"]+)"\)/g)].map((m) => m[1]!);
    for (const slot of reads) expect(tokens, slot).toContain(`name = ${JSON.stringify(slot)}`);
    for (const definition of tokens.matchAll(/name = "([^"]+)"/g)) {
      expect(reads, definition[1]).toContain(definition[1]!);
    }
    for (const slot of [
      "field.color.bg", "field.color.border", "field.radius",
      "field.color.invalid-border", "field.color.valid-border", "field.color.focus-border",
      "field.focus.ring.width", "field.focus.ring.color", "field.focus.ring.style",
      "field.focus.ring.offset", "field.pad.x",
    ]) {
      expect(tokens).not.toContain(`name = ${JSON.stringify(slot)}`);
    }
    expect(source).not.toContain("fieldBackground");
    expect(source).not.toContain("fieldBorder");
    expect(source).not.toContain(".clip(fieldShape)");
  });

});

describe("generateJetpackComposeComponentSource — referenced-action composite (FEAT-COMPOSE-REFERENCE-REALIZATION-01)", () => {
  it("composes the contract's referenced controls instead of re-implementing them (Chip)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Chip"));
    // The declared references lower to calls on the referenced generated class,
    // with the axis enums imported from that class's own package.
    expect(src).toContain("import com.fullstackds.components.button.Button");
    expect(src).toContain("import com.fullstackds.components.button.ButtonVariant");
    expect(src).toContain("enum class ChipVariant { Default, Selected, Dismissible }");
    expect(src).toContain("enum class ChipSize { Small, Medium, Large }");
    expect(src).toContain("enum class ChipType { Button, Submit, Reset }");
    // Action reference: declared variant, bound disabled/aria label, click
    // callback and the projected icon + consumer content.
    expect(src).toContain("variant = ButtonVariant.Ghost,");
    expect(src).toContain("disabled = disabled,");
    expect(src).toContain("accessibilityLabel = ariaLabel,");
    expect(src).toContain("onClick = { onClick?.invoke() },");
    expect(src).toContain("icon?.invoke()");
    // Dismiss reference: guarded by the contract's `if: dismissible`, and a
    // composite control's content parameter is required, so it passes a body.
    expect(src).toContain("if (dismissible) {");
    expect(src).toContain("accessibilityLabel = dismissLabel,");
    expect(src).toContain("onClick = { onDismiss?.invoke() },");
    // The node's HTML-authoring facts are structural, never arguments.
    expect(src).not.toContain("type = ChipType.Button,");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Chip\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

  it("keeps the chip token set closed and names the slots it does not claim (Chip)", () => {
    const source = generateJetpackComposeComponentSource(irFor("Chip"));
    const tokens = generateJetpackComposeTokensFile(irFor("Chip"));
    for (const slot of [
      "chip.color.background.default",
      "chip.color.foreground.default",
      "chip.color.border.default",
      "chip.color.background.hover",
      "chip.size.border",
      "chip.size.gap",
      "chip.size.radius",
      "chip.size.minHeight",
      "chip.text.size",
      "chip.text.weight",
      "box-model.gap",
    ]) {
      expect(source).toContain(`layeredSlot(${JSON.stringify(slot)})`);
      expect(tokens).toContain(`name = ${JSON.stringify(slot)}`);
    }
    const reads = [...source.matchAll(/layeredSlot\("([^"]+)"\)/g)].map((m) => m[1]!);
    for (const slot of reads) expect(tokens, slot).toContain(`name = ${JSON.stringify(slot)}`);
    for (const definition of tokens.matchAll(/name = "([^"]+)"/g)) {
      expect(reads, definition[1]).toContain(definition[1]!);
    }
    for (const slot of [
      "chip.color.background.selected",
      "chip.color.foreground.selected",
      "chip.color.border.selected",
      "chip.size.padding.horizontal",
      "chip.size.padding.vertical",
      "chip.dismiss.gap",
      "chip.motion.duration.fast",
      "chip.dismiss.size",
    ]) {
      expect(tokens).not.toContain(`name = ${JSON.stringify(slot)}`);
    }
  });
});

describe("generateJetpackComposeComponentSource — date-grid surface (FEAT-COMPOSE-CALENDAR-ADMISSION-01)", () => {
  it("realizes the declared grid over the days prop and the day-of-month projection (Calendar)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Calendar"));
    // The date substrate carries the projection and the day-granular state.
    expect(src).toContain("import com.fullstackds.date.FsdsDate");
    expect(src).toContain("text = FsdsDate.dayOfMonth(item).toString(),");
    expect(src).toContain("val selected = if (mode == CalendarMode.Range)");
    expect(src).toContain("FsdsDate.toggle(resolvedValues, item)");
    // The range arm is the union's collection arm; the axis member that
    // selects it is derived from the declared axis order.
    expect(src).toContain("if (mode == CalendarMode.Range) {");
    // Channel arms lowered as the scalar/many pair; no component-name lore.
    expect(src).toContain("value: Date? = null,");
    expect(src).toContain("values: List<Date>? = null,");
    expect(src).toContain("onValuesChange: ((List<Date>) -> Unit)? = null,");
    expect(src).toContain("mode: CalendarMode = CalendarMode.Single,");
    expect(src).toContain("days: List<Date> = emptyList(),");
    // One row per calendar week, and the contract's own accessible labels.
    expect(src).toContain("days.chunked(fsdsWeekLength).forEach { week ->");
    expect(src).toContain('contentDescription = "Previous month"');
    expect(src).toContain('contentDescription = "Next month"');
    expect(src).toContain('contentDescription = "Calendar"');
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Calendar\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

  it("derives the range arm from the declared axis order instead of naming it", () => {
    const base = irFor("Calendar");
    const reversed = {
      ...base,
      definedTypes: {
        ...base.definedTypes,
        CalendarMode: { kind: "union", values: ["range", "single"] },
      },
    } as Parameters<typeof generateJetpackComposeComponentSource>[0];
    const src = generateJetpackComposeComponentSource(reversed);
    // The collection arm now pairs with the FIRST declared axis member, so the
    // emitted comparison moves with the contract rather than staying on the
    // string "range".
    expect(src).toContain("enum class CalendarMode { Range, Single }");
    expect(src).toContain("if (mode == CalendarMode.Single)");
    expect(src).not.toContain("if (mode == CalendarMode.Range)");
  });

  it("reads exactly the calendar chrome it realizes, with a closed token set (Calendar)", () => {
    const source = generateJetpackComposeComponentSource(irFor("Calendar"));
    const tokens = generateJetpackComposeTokensFile(irFor("Calendar"));
    for (const slot of [
      "calendar.color.background.default",
      "calendar.color.foreground.primary",
      "calendar.color.foreground.muted",
      "calendar.color.border.default",
      "calendar.color.day.hover",
      "calendar.color.day.selected.background",
      "calendar.color.day.selected.foreground",
      "calendar.color.today.ring",
      "calendar.color.focus.ring",
      "calendar.focus.ring.width",
      "calendar.size.padding.default",
      "calendar.size.cell",
      "calendar.size.nav",
      "calendar.size.radius.default",
      "calendar.size.radius.day",
      "calendar.typography.caption.size",
      "calendar.typography.day.size",
      "box-model.gap",
    ]) {
      expect(source).toContain(`layeredSlot(${JSON.stringify(slot)})`);
      expect(tokens).toContain(`name = ${JSON.stringify(slot)}`);
    }
    const reads = [...source.matchAll(/layeredSlot\("([^"]+)"\)/g)].map((m) => m[1]!);
    for (const slot of reads) expect(tokens, slot).toContain(`name = ${JSON.stringify(slot)}`);
    for (const definition of tokens.matchAll(/name = "([^"]+)"/g)) {
      expect(reads, definition[1]).toContain(definition[1]!);
    }
  });

  it("names the calendar slots it does not realize, so each divergence is a decision (Calendar)", () => {
    const tokens = generateJetpackComposeTokensFile(irFor("Calendar"));
    for (const slot of ["calendar.elevation.default", "calendar.focus.ring.offset"]) {
      expect(tokens).not.toContain(`name = ${JSON.stringify(slot)}`);
    }
  });
});

describe("generateJetpackComposeComponentSource — centered surface (FEAT-COMPOSE-DIALOG-ADMISSION-01)", () => {
  it("hosts the centered surface on the foundation Dialog with dismissal wiring (Dialog)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Dialog"));
    expect(src).toContain("import androidx.compose.ui.window.Dialog as ComposeDialog");
    expect(src).toContain("open: Boolean? = null,");
    expect(src).toContain("val resolvedOpen = open ?: uncontrolledOpen");
    expect(src).toContain("ComposeDialog(");
    expect(src).toContain("onDismissRequest = { dismiss() }");
    expect(src).toContain("dismissOnBackPress = closeOnEscape,");
    expect(src).toContain("dismissOnClickOutside = closeOnBackdropClick,");
    expect(src).toContain("if (!resolvedOpen) return");
    expect(src).toContain('layeredSlot("dialog.color.background.default")');
    expect(src).toContain('layeredSlot("dialog.size.radius.default")');
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Dialog\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });
});

describe("generateJetpackComposeComponentSource — centered surface with a string channel (FEAT-COMPOSE-COMMAND-ADMISSION-01)", () => {
  it("lowers the second string channel to a search field and keeps the palette chrome part-scoped (Command)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Command"));
    expect(src).toContain("ComposeDialog(");
    expect(src).toContain("BasicTextField(");
    expect(src).toContain("search: String? = null,");
    expect(src).toContain('defaultSearch: String = "",');
    expect(src).toContain("onSearchChange: ((String) -> Unit)? = null,");
    expect(src).toContain('placeholder: String = "Search...",');
    expect(src).toContain("if (search == null) { uncontrolledSearch = next }");
    expect(src).toContain("onSearchChange?.invoke(next)");
    expect(src).toContain("val resolvedSearch = search ?: uncontrolledSearch");
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Command\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

  it("reads exactly the chrome it realizes, with every read backed by a tokens definition (Command)", () => {
    const source = generateJetpackComposeComponentSource(irFor("Command"));
    const tokens = generateJetpackComposeTokensFile(irFor("Command"));
    for (const slot of [
      "command.color.background",
      "command.color.text",
      "command.color.textMuted",
      "command.color.borderLight",
      "command.color.border",
      "command.border.width",
      "command.border.radius",
      "command.text.size",
      "command.size.maxWidth",
      "command.size.maxHeight",
      "box-model.gap",
    ]) {
      expect(source).toContain(`layeredSlot(${JSON.stringify(slot)})`);
      expect(tokens).toContain(`name = ${JSON.stringify(slot)}`);
    }
    // The panel is bounded by the palette's own max-size slots, not by the
    // platform dialog width.
    expect(source).toMatch(
      /\.requiredSizeIn\(minWidth = .*?, minHeight = .*?, maxWidth = panelMaxWidth, maxHeight = panelMaxHeight\)/,
    );
    // Closure property: the tokens file is exactly the read set, in the test
    // IR and in the CLI IR (which additionally injects box-model geometry).
    const reads = [...source.matchAll(/layeredSlot\("([^"]+)"\)/g)].map((m) => m[1]!);
    expect(reads.length).toBeGreaterThanOrEqual(10);
    for (const slot of reads) {
      expect(tokens, slot).toContain(`name = ${JSON.stringify(slot)}`);
    }
    for (const definition of tokens.matchAll(/name = "([^"]+)"/g)) {
      expect(reads, definition[1]).toContain(definition[1]!);
    }
  });

  it("names the palette slots it does not realize, so the divergence is a decision not an omission (Command)", () => {
    const tokens = generateJetpackComposeTokensFile(irFor("Command"));
    for (const slot of [
      "command.color.overlay",
      "command.color.backgroundHover",
      "command.spacing.dialogPadding",
      "command.size.topOffset",
      "command.size.icon",
      "command.text.sizeSmall",
      "command.shadow",
      "command.opacity.disabled",
    ]) {
      expect(tokens).not.toContain(`name = ${JSON.stringify(slot)}`);
    }
  });

  it("adds no search affordance to a centered surface without a string channel (Dialog)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Dialog"));
    expect(src).not.toContain("BasicTextField(");
    expect(src).not.toContain("panelMaxWidth");
    expect(src).not.toContain("CompositionLocalProvider");
    expect(src).not.toContain("import androidx.compose.ui.text.TextStyle");
    expect(src).toContain('layeredSlot("dialog.color.background.default")');
  });
});

describe("generateJetpackComposeComponentSource — viewport-edge surfaces (FEAT-COMPOSE-EDGE-SURFACES-01)", () => {
  it("places Sheet at the declared edge (side enum -> alignment)", () => {
    const src = generateJetpackComposeComponentSource(irFor("Sheet"));
    expect(src).toContain("enum class SheetSide {");
    expect(src).toContain("side: SheetSide =");
    expect(src).toContain("Box(Modifier.fillMaxSize(), contentAlignment = when (side) {");
    expect(src).toContain("SheetSide.Right -> Alignment.CenterEnd");
    expect(src).toContain("usePlatformDefaultWidth = false,");
    expect(src).toContain('layeredSlot("sheet.border.radius")');
    expect(src).not.toMatch(/import androidx\.compose\.material/);
    expect(src.match(/fun Sheet\(([^)]*)\)/)![1]!.trim().startsWith("modifier: Modifier = Modifier,")).toBe(true);
  });

  it("auto-dismisses Toast through its duration prop", () => {
    const src = generateJetpackComposeComponentSource(irFor("Toast"));
    expect(src).toContain("duration: Int? = null,");
    expect(src).toContain("LaunchedEffect(resolvedOpen, duration) {");
    expect(src).toContain("kotlinx.coroutines.delay(duration.toLong())");
    expect(src).toContain("dismiss()");
    expect(src).toContain('layeredSlot("toast.surface.radius")');
    expect(src).not.toMatch(/import androidx\.compose\.material/);
  });
});

describe("anchored surfaces (FEAT-COMPOSE-ANCHORED-SURFACES-01)", () => {
  it("emits a measured-anchor Popup for a click-triggered surface (Popover)", async () => {
    const { generateJetpackComposeSurfaceFiles } = await import("./surface-emit.js");
    const { componentFile, tokensFile } = generateJetpackComposeSurfaceFiles(irFor("Popover"));
    expect(componentFile).toContain("enum class PopoverPlacement {");
    expect(componentFile).toContain("trigger: @Composable () -> Unit,");
    expect(componentFile).toContain(".onGloballyPositioned { coords ->");
    expect(componentFile).toContain(".clickable { setOpen(!resolvedOpen) }");
    expect(componentFile).toContain("Popup(");
    expect(componentFile).toContain("offset = IntOffset(offsetX(placement, anchorWidth), offsetY(placement, anchorHeight)),");
    expect(componentFile).toContain('layeredSlot("popover.color.border.default")');
    expect(componentFile).not.toMatch(/import androidx\.compose\.material/);
    // The surface path now emits a tokens file (definitions the parity gate requires).
    expect(tokensFile).toContain("ComponentTokenDefinition(");
  });

  it("opens a hover/focus-triggered surface from interaction state (Tooltip)", async () => {
    const { generateJetpackComposeSurfaceFiles } = await import("./surface-emit.js");
    const { componentFile } = generateJetpackComposeSurfaceFiles(irFor("Tooltip"));
    expect(componentFile).toContain("val hovered by interactionSource.collectIsHoveredAsState()");
    expect(componentFile).toContain("val focused by interactionSource.collectIsFocusedAsState()");
    expect(componentFile).toContain("LaunchedEffect(hovered, focused) {");
    expect(componentFile).toContain(".hoverable(interactionSource = interactionSource)");
    expect(componentFile).toContain('layeredSlot("tooltip.color.background.default")');
  });
});
