// FsdsCheckbox — custom-painted, token-driven checkbox substrate for the
// generated ds-jetpack-compose components (FEAT-COMPOSE-ADMISSION-SUBSTRATE-01).
//
// Painted rather than wrapping Material 3's Checkbox for the same reason
// FsdsToggle paints (FEAT-COMPOSE-CUSTOM-PAINTED-001): the contract's
// token slots (border width/radius, focus ring, transition duration,
// disabled tones, touch minimums) must be reachable, and the wrapper
// exposes only a fraction of them. Semantics parity with the wrapper era
// is preserved through Modifier.toggleable with Role.Checkbox — the same
// accessibility contract M3 itself uses; its ToggleableState is announced
// in the user's locale, so no English stateDescription overrides it.
//
// Named divergences (ledgered in
// docs/architecture/native-target-admission.md, not silently dropped):
//   - tri-state/indeterminate is NOT lowered — the substrate is binary,
//     exactly like the SwiftUI boolean-control twin;
//   - the visual box geometry comes from the framework-grammar table in
//     the emitter (no checkbox.size.* token exists in the graph yet).
//
// Substrate directories are family-named (toggle/, rule/, controls/) and
// must never match a component name in any casing: on case-insensitive
// filesystems a `checkbox/` substrate dir collides with the generated
// `Checkbox/` component dir — one physical directory, two owners.
//
// Zero androidx.compose.material imports: runtime/ui/foundation/animation
// only. This file is NOT generated; it is committed substrate, like
// FsdsTheme.kt and FsdsToggle.kt.

package com.fullstackds.components.controls

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSizeIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Fully-resolved checkbox styling — @Immutable so the generated
 *  component's style object stays skippable across recomposition. */
@Immutable
class FsdsCheckboxStyle(
    val boxSize: Dp,
    val boxColorChecked: Color,
    val boxColorUnchecked: Color,
    val boxColorDisabled: Color,
    val checkColorChecked: Color,
    val checkColorDisabled: Color,
    val borderColor: Color? = null,
    val borderWidth: Dp = 1.dp,
    val boxRadius: Dp = 4.dp,
    val focusRingColor: Color? = null,
    val focusRingWidth: Dp = 2.dp,
    val transitionDurationMs: Int = 150,
    val minTouchWidth: Dp = 32.dp,
    val minTouchHeight: Dp = 32.dp,
    val padding: PaddingValues = PaddingValues(0.dp),
)

@Composable
fun FsdsCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    style: FsdsCheckboxStyle,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    contentDescription: String? = null,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()

    val colorSpec = tween<Color>(durationMillis = style.transitionDurationMs)
    val boxColor by animateColorAsState(
        targetValue = when {
            !enabled -> style.boxColorDisabled
            checked -> style.boxColorChecked
            else -> style.boxColorUnchecked
        },
        animationSpec = colorSpec,
        label = "fsds-checkbox-box",
    )
    val checkColor by animateColorAsState(
        targetValue = if (enabled) style.checkColorChecked else style.checkColorDisabled,
        animationSpec = colorSpec,
        label = "fsds-checkbox-check",
    )
    val checkProgress by animateFloatAsState(
        targetValue = if (checked) 1f else 0f,
        animationSpec = tween(durationMillis = style.transitionDurationMs),
        label = "fsds-checkbox-check-progress",
    )

    val boxShape = RoundedCornerShape(style.boxRadius)
    val focusRing = focused && style.focusRingColor != null

    Box(
        modifier = modifier
            .padding(style.padding)
            .requiredSizeIn(
                // 48dp touch-area floor (M3 accessibility baseline); the box
                // is drawn centered inside it, so the floor never inflates
                // the visual.
                minWidth = style.minTouchWidth.coerceAtLeast(48.dp),
                minHeight = style.minTouchHeight.coerceAtLeast(48.dp),
            )
            .toggleable(
                value = checked,
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Checkbox,
                onValueChange = onCheckedChange,
            )
            .focusable(interactionSource = interactionSource)
            .semantics {
                if (contentDescription != null) {
                    this.contentDescription = contentDescription
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(style.boxSize)
                .let { base ->
                    val color = if (focusRing) style.focusRingColor else style.borderColor
                    val width = if (focusRing) style.focusRingWidth else style.borderWidth
                    if (color != null) {
                        base.border(border = BorderStroke(width, color), shape = boxShape)
                    } else {
                        base
                    }
                }
                .clip(boxShape)
                .background(boxColor)
                // The check glyph is painted inside the same clipped box so
                // the token radius governs it too. A whole-glyph fade/scale
                // (not a partial-path reveal) — visual nuance, ungated.
                .drawBehind {
                    if (checkProgress <= 0f) return@drawBehind
                    val stroke = Stroke(width = size.width * 0.14f * checkProgress)
                    val path = Path().apply {
                        moveTo(size.width * 0.22f, size.height * 0.52f)
                        lineTo(size.width * 0.42f, size.height * 0.72f)
                        lineTo(size.width * 0.78f, size.height * 0.28f)
                    }
                    drawPath(
                        path = path,
                        color = checkColor,
                        alpha = checkProgress,
                        style = stroke,
                    )
                },
        )
    }
}
