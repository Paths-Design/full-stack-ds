// Motion-lab native lane — Compose realization of the motion-lab spec.
//
// Every animated duration, easing curve, and stagger interval comes from
// FsdsMotionTokens (generated from the committed token graph — the same
// facts the web lanes read as CSS custom properties and the SwiftUI lane
// maps onto Animation.timingCurve). No timing literals live in this file.
//
// Reduced-motion boundary note (lane finding): Compose desktop exposes no
// OS-level reduced-motion preference the way SwiftUI does
// (accessibilityReduceMotion) or the web does (prefers-reduced-motion).
// The lane ships an explicit in-app toggle that stands in for that
// preference and drives the same settle-don't-animate substitution.
package com.fullstackds.examples.motionlab

import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fullstackds.components.badge.Badge
import com.fullstackds.components.badge.BadgeIntent
import com.fullstackds.components.button.FsdsButton
import com.fullstackds.components.button.FsdsButtonStyle
import com.fullstackds.components.card.Card
import com.fullstackds.components.card.Content
import com.fullstackds.components.card.Header
import com.fullstackds.components.icon.Icon
import com.fullstackds.components.icon.IconSize
import com.fullstackds.components.skeleton.Skeleton
import com.fullstackds.components.skeleton.SkeletonAnimate
import com.fullstackds.components.skeleton.SkeletonVariant
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Map a token-resolved bezier curve onto Compose's native easing type. */
fun FsdsMotionCurve.easing(): CubicBezierEasing = CubicBezierEasing(x1, y1, x2, y2)

/** Token timing → animation spec; under reduced motion everything snaps. */
private fun <T> motionSpec(durationMs: Int, curve: FsdsMotionCurve, reduceMotion: Boolean): AnimationSpec<T> =
    if (reduceMotion) snap() else tween(durationMillis = durationMs, easing = curve.easing())

private fun curveLine(name: String, curve: FsdsMotionCurve): String =
    "$name = cubic-bezier(${curve.x1}, ${curve.y1}, ${curve.x2}, ${curve.y2})"

@Composable
private fun StationShell(
    title: String,
    detail: String,
    tokensLine: String,
    content: @Composable () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium)
        Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            tokensLine,
            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
            fontSize = 10.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier
                .clip(RoundedCornerShape(6.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                .padding(8.dp),
        )
        content()
    }
}

@Composable
fun MotionLabApp(reduceMotion: Boolean, onToggleReduceMotion: () -> Unit) {
    MaterialTheme {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .padding(24.dp)
                .width(880.dp),
            verticalArrangement = Arrangement.spacedBy(22.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("FSDS Motion Lab — Compose", style = MaterialTheme.typography.headlineSmall)
                FsdsButton(
                    onClick = onToggleReduceMotion,
                    style = FsdsButtonStyle(),
                ) {
                    Text(if (reduceMotion) "Reduce motion: on" else "Reduce motion: off")
                }
            }
            Text(
                "Consumer-side proof: every effect is driven by platform-native animation against the " +
                    "ds-jetpack-compose public API, timed entirely by generated token constants. Compose desktop " +
                    "has no OS reduced-motion signal, so the toggle above stands in for that preference.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            EntranceStation(reduceMotion)
            StaggerStation(reduceMotion)
            ScrambleStation(reduceMotion)
            PartTakeoverStation(reduceMotion)
            GlyphLoopStation(reduceMotion)
        }
    }
}

@Composable
private fun EntranceStation(reduceMotion: Boolean) {
    var shown by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        if (!reduceMotion) delay(FsdsMotionTokens.Duration.Instant)
        shown = true
    }
    val duration = FsdsMotionTokens.Duration.Medium2.toInt()
    val curve = FsdsMotionTokens.Easing.SoftEnter
    val alpha by animateFloatAsState(if (shown) 1f else 0f, motionSpec(duration, curve, reduceMotion), label = "alpha")
    val translationY by animateFloatAsState(if (shown) 0f else 24f, motionSpec(duration, curve, reduceMotion), label = "ty")
    val scale by animateFloatAsState(if (shown) 1f else 0.96f, motionSpec(duration, curve, reduceMotion), label = "scale")
    StationShell(
        "1 · Entrance — whole component",
        "An FSDS Card composes in with opacity + rise + scale on token-resolved tween specs.",
        "motion.duration.medium2 = ${FsdsMotionTokens.Duration.Medium2}ms · ${curveLine("motion.easing.soft-enter", curve)}",
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Card(
                Modifier.graphicsLayer {
                    this.alpha = alpha
                    this.translationY = translationY
                    this.scaleX = scale
                    this.scaleY = scale
                },
            ) {
                Header { Text("Token-driven entrance", style = MaterialTheme.typography.titleSmall) }
                Content {
                    Text(
                        "The card is the animation target; the easing is the token graph's bezier, mapped onto CubicBezierEasing.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
            FsdsButton(
                onClick = { scope.launch { shown = false; delay(FsdsMotionTokens.Duration.Instant); shown = true } },
                style = FsdsButtonStyle(),
            ) { Text("Replay") }
        }
    }
}

@Composable
private fun StaggerStation(reduceMotion: Boolean) {
    var shown by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { shown = true }
    val intents = listOf(
        BadgeIntent.Info, BadgeIntent.Success, BadgeIntent.Warning,
        BadgeIntent.Danger, BadgeIntent.Info, BadgeIntent.Success,
    )
    val duration = FsdsMotionTokens.Duration.Short2.toInt()
    val stagger = FsdsMotionTokens.Stagger.Sm.toInt()
    val curve = FsdsMotionTokens.Easing.QuickEnter
    StationShell(
        "2 · Stagger — repeated instances",
        "Each badge animates on the same token curve, delayed by its index times the token stagger.",
        "motion.duration.short2 = ${FsdsMotionTokens.Duration.Short2}ms · motion.stagger.sm = ${FsdsMotionTokens.Stagger.Sm}ms · ${curveLine("motion.easing.quick-enter", curve)}",
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                intents.forEachIndexed { index, intent ->
                    val spec: AnimationSpec<Float> =
                        if (reduceMotion) snap() else tween(duration, delayMillis = index * stagger, easing = curve.easing())
                    val alpha by animateFloatAsState(if (shown) 1f else 0f, spec, label = "alpha$index")
                    val translationY by animateFloatAsState(if (shown) 0f else 14f, spec, label = "ty$index")
                    val scale by animateFloatAsState(if (shown) 1f else 0.9f, spec, label = "scale$index")
                    Badge(
                        intent = intent,
                        modifier = Modifier.graphicsLayer {
                            this.alpha = alpha
                            this.translationY = translationY
                            this.scaleX = scale
                            this.scaleY = scale
                        },
                    ) { Text("item ${index + 1}") }
                }
            }
            FsdsButton(
                onClick = { scope.launch { shown = false; delay(120); shown = true } },
                style = FsdsButtonStyle(),
            ) { Text("Replay") }
        }
    }
}

private val SCRAMBLE_PHRASE = "TOKENS DRIVE MOTION"
private val SCRAMBLE_POOL = "!<>-_\\/[]{}—=+*^?#".toList()

@Composable
private fun ScrambleStation(reduceMotion: Boolean) {
    var display by remember { mutableStateOf(SCRAMBLE_PHRASE.toList()) }
    val scope = rememberCoroutineScope()
    StationShell(
        "3 · Scramble — per-character symbol swap",
        "Stable per-index character slots cycle through a symbol pool and settle back to the phrase.",
        "motion.duration.short1 = ${FsdsMotionTokens.Duration.Short1}ms per swap · motion.stagger.xs = ${FsdsMotionTokens.Stagger.Xs}ms per character",
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                display.forEachIndexed { index, char ->
                    Text(
                        char.toString(),
                        fontSize = 22.sp,
                        modifier = Modifier.width(14.dp),
                    )
                }
            }
            FsdsButton(
                onClick = {
                    scope.launch {
                        if (reduceMotion) {
                            display = SCRAMBLE_PHRASE.toList()
                            return@launch
                        }
                        val originals = SCRAMBLE_PHRASE.toList()
                        val cadence = FsdsMotionTokens.Duration.Short1
                        val stagger = FsdsMotionTokens.Stagger.Xs
                        kotlinx.coroutines.coroutineScope {
                            originals.forEachIndexed { index, original ->
                                launch {
                                    delay(index * stagger)
                                    repeat(4) {
                                        display = display.toMutableList().also { it[index] = SCRAMBLE_POOL.random() }
                                        delay(cadence)
                                    }
                                    display = display.toMutableList().also { it[index] = original }
                                }
                            }
                        }
                    }
                },
                style = FsdsButtonStyle(),
            ) { Text("Scramble") }
        }
    }
}

@Composable
private fun PartTakeoverStation(reduceMotion: Boolean) {
    val duration = FsdsMotionTokens.Duration.Medium.toInt()
    val stagger = FsdsMotionTokens.Stagger.Md.toInt()
    val curve = FsdsMotionTokens.Easing.Continuous
    StationShell(
        "4 · Part takeover — one channel, exclusively owned",
        "Skeleton shimmer is switched off via the public animate argument; the consumer pulses the hosts.",
        "motion.duration.medium = ${FsdsMotionTokens.Duration.Medium}ms · motion.stagger.md = ${FsdsMotionTokens.Stagger.Md}ms · ${curveLine("motion.easing.continuous", curve)}",
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            repeat(3) { index ->
                val pulse = if (reduceMotion) {
                    1f
                } else {
                    val transition = rememberInfiniteTransition(label = "pulse$index")
                    transition.animateFloat(
                        initialValue = 1f,
                        targetValue = 0.45f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(duration, easing = curve.easing()),
                            repeatMode = RepeatMode.Reverse,
                            initialStartOffset = StartOffset(index * stagger),
                        ),
                        label = "pulse$index",
                    ).value
                }
                Skeleton(
                    variant = SkeletonVariant.Text,
                    animate = SkeletonAnimate.None,
                    modifier = Modifier.graphicsLayer { alpha = pulse },
                ) {
                    androidx.compose.foundation.layout.Box(
                        Modifier
                            .width(240.dp)
                            .height(12.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(MaterialTheme.colorScheme.outlineVariant),
                    )
                }
            }
        }
    }
}

@Composable
private fun GlyphLoopStation(reduceMotion: Boolean) {
    var revealed by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val loopDuration = FsdsMotionTokens.Duration.Medium1.toInt()
    val linear = FsdsMotionTokens.Easing.Linear
    val revealDuration = FsdsMotionTokens.Duration.Short3.toInt()
    val bounce = FsdsMotionTokens.Easing.Bounce
    val angle = if (reduceMotion) {
        0f
    } else {
        val transition = rememberInfiniteTransition(label = "spin")
        transition.animateFloat(
            initialValue = 0f,
            targetValue = 360f,
            animationSpec = infiniteRepeatable(tween(loopDuration, easing = linear.easing()), RepeatMode.Restart),
            label = "spin",
        ).value
    }
    val revealScale by animateFloatAsState(if (revealed) 1f else 0.55f, motionSpec(revealDuration, bounce, reduceMotion), label = "revealScale")
    val revealAlpha by animateFloatAsState(if (revealed) 1f else 0f, motionSpec(revealDuration, bounce, reduceMotion), label = "revealAlpha")
    StationShell(
        "5 · Glyphs — whole-glyph loop, overshoot reveal",
        "Left: forever rotation on the token linear curve. Right: a bounce-curve reveal (y overshoot is authored in the token). Per-path SVG reveal has no public native equivalent (lane finding).",
        "loop motion.duration.medium1 = ${FsdsMotionTokens.Duration.Medium1}ms linear · reveal motion.duration.short3 = ${FsdsMotionTokens.Duration.Short3}ms · ${curveLine("motion.easing.bounce", bounce)}",
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(48.dp), modifier = Modifier.padding(top = 10.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(
                        name = "arrow-up-down",
                        size = IconSize.Lg,
                        modifier = Modifier.graphicsLayer { rotationZ = angle },
                    )
                    Text("whole-glyph loop", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(
                        name = "circle-dot",
                        size = IconSize.Lg,
                        modifier = Modifier.graphicsLayer {
                            scaleX = revealScale
                            scaleY = revealScale
                            alpha = revealAlpha
                        },
                    )
                    Text("bounce-curve reveal", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            FsdsButton(
                onClick = { scope.launch { revealed = false; delay(FsdsMotionTokens.Duration.Instant); revealed = true } },
                style = FsdsButtonStyle(),
            ) { Text("Reveal") }
        }
    }
}
