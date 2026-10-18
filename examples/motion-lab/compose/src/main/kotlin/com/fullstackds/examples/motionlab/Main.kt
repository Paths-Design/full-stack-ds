// Motion-lab native lane — Compose desktop entry point.
//
// Locally runnable: `./gradlew run` opens the motion-lab window. The lane's
// compile admission is `./gradlew compileKotlin` (mirroring the settings
// compose lane). The app installs the FSDS theme runtime so generated
// components resolve their semantic defaults from the token graph.
package com.fullstackds.examples.motionlab

import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import com.fullstackds.tokens.FsdsSemanticDefaults
import com.fullstackds.tokens.FsdsTheme
import com.fullstackds.tokens.FsdsThemeProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

fun main() = application {
    Window(
        title = "FSDS Motion Lab — Compose lane",
        onCloseRequest = ::exitApplication,
    ) {
        var reduceMotion by remember { mutableStateOf(false) }
        FsdsThemeProvider(FsdsTheme(FsdsSemanticDefaults.light)) {
            MotionLabApp(reduceMotion = reduceMotion, onToggleReduceMotion = { reduceMotion = !reduceMotion })
        }
    }
}
