// FsdsToggle — custom-painted, token-driven toggle substrate for the
// generated ds-jetpack-compose components (FEAT-COMPOSE-CUSTOM-PAINTED-001).
//
// Why paint instead of wrapping Material 3's Switch: the M3 wrapper exposes
// ~6 styling slots while the toggle contract carries ~48 — thumb shadow,
// press duration, token-colored focus, and disabled styling are structurally
// unreachable through it. This substrate draws track, thumb, border, shadow,
// focus indication, press response, and disabled states from RESOLVED token
// values, mirroring how the web family renders from styles: the emitter
// resolves scope data through LocalFsdsTheme and passes a FsdsToggleStyle.
//
// Semantics parity with the wrapper era is preserved: Modifier.toggleable
// with Role.Switch (the same accessibility contract M3 itself uses); its
// ToggleableState carries the on/off value, which the platform announces in
// the user's locale, so no English stateDescription overrides it.
// Interaction physics (press/focus animation) is
// now ours — a named ownership trade, not an accident.
//
// Zero androidx.compose.material imports: runtime/ui/foundation/animation
// only. This file is NOT generated; it is committed substrate, like
// FsdsTheme.kt and createCompoundContext.ts.

package com.fullstackds.components.toggle

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSizeIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.selection.toggleable
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

/** Fully-resolved toggle styling — @Immutable so the generated component's
 *  style object stays skippable across recomposition (M3 stability contract). */
@Immutable
class FsdsToggleStyle(
    val trackWidth: Dp,
    val trackHeight: Dp,
    val trackColorChecked: Color,
    val trackColorUnchecked: Color,
    val trackColorDisabled: Color,
    val thumbColorChecked: Color,
    val thumbColorUnchecked: Color,
    val thumbColorDisabled: Color,
    val trackBorderColor: Color? = null,
    val trackBorderWidth: Dp = 1.dp,
    /** CSS multi-shadow strings ("0px 1px 2px #0000000f, …") are approximated
     *  by a single elevation — a ledgered approximation, not parity. */
    val thumbElevation: Dp = 2.dp,
    val focusRingColor: Color? = null,
    val focusRingWidth: Dp = 2.dp,
    val pressDurationMs: Int = 100,
    val minTouchWidth: Dp = 32.dp,
    val minTouchHeight: Dp = 32.dp,
    val padding: PaddingValues = PaddingValues(0.dp),
    /** Gap between the thumb and the track's inner edge. */
    val thumbInset: Dp = 2.dp,
)

@Composable
fun FsdsToggle(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    style: FsdsToggleStyle,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    contentDescription: String? = null,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val focused by interactionSource.collectIsFocusedAsState()

    val animationSpec = tween<Float>(durationMillis = style.pressDurationMs)
    val colorSpec = tween<androidx.compose.ui.graphics.Color>(durationMillis = style.pressDurationMs)
    val thumbProgress by animateFloatAsState(
        targetValue = if (checked) 1f else 0f,
        animationSpec = animationSpec,
        label = "fsds-toggle-thumb",
    )
    val trackColor by animateColorAsState(
        targetValue = when {
            !enabled -> style.trackColorDisabled
            checked -> style.trackColorChecked
            else -> style.trackColorUnchecked
        },
        animationSpec = colorSpec,
        label = "fsds-toggle-track",
    )
    val thumbColor by animateColorAsState(
        targetValue = when {
            !enabled -> style.thumbColorDisabled
            checked -> style.thumbColorChecked
            else -> style.thumbColorUnchecked
        },
        animationSpec = colorSpec,
        label = "fsds-toggle-thumb-color",
    )
    val pressScale by animateFloatAsState(
        targetValue = if (pressed) 0.9f else 1f,
        animationSpec = tween(durationMillis = style.pressDurationMs / 2),
        label = "fsds-toggle-press",
    )

    val trackShape = RoundedCornerShape(50)
    val thumbSize = (style.trackHeight - style.thumbInset * 2).coerceAtLeast(1.dp)
    val travel = (style.trackWidth - thumbSize - style.thumbInset * 2).coerceAtLeast(0.dp)

    Box(
        modifier = modifier
            .padding(style.padding)
            .requiredSizeIn(
                // 48dp touch-area floor (M3 accessibility baseline) on top of
                // the token-driven minimums: the track is drawn centered inside
                // this box, so the floor never inflates the track visual. The
                // button substrate cannot split visual/touch without
                // minimumInteractiveComponentSize (Android-only, absent from
                // the CMP 1.8.0 desktop toolchain), so its touch sizing stays
                // token-driven — named non-claim.
                minWidth = style.minTouchWidth.coerceAtLeast(48.dp),
                minHeight = style.minTouchHeight.coerceAtLeast(48.dp),
            )
            .toggleable(
                value = checked,
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Switch,
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
        val borderWidth = if (focused && style.focusRingColor != null) {
            style.focusRingWidth
        } else {
            style.trackBorderWidth
        }
        val borderColor = if (focused && style.focusRingColor != null) {
            style.focusRingColor
        } else {
            style.trackBorderColor
        }
        Box(
            modifier = Modifier
                .size(width = style.trackWidth, height = style.trackHeight)
                .let { base ->
                    if (borderColor != null) {
                        base.border(
                            border = BorderStroke(borderWidth, borderColor),
                            shape = trackShape,
                        )
                    } else {
                        base
                    }
                }
                .clip(trackShape)
                .background(trackColor),
        ) {
            val scaledThumb = thumbSize * pressScale
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .offset {
                        val x = style.thumbInset + travel * thumbProgress + (thumbSize - scaledThumb) / 2
                        IntOffset(x.roundToPx(), 0)
                    }
                    .size(scaledThumb)
                    .shadow(elevation = style.thumbElevation, shape = CircleShape, clip = false)
                    .clip(CircleShape)
                    .background(thumbColor),
            )
        }
    }
}
