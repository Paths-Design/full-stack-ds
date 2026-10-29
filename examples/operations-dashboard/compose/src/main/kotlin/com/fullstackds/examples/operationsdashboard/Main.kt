// Operations dashboard example — jetpack-compose lane, desktop entry point.
//
// Locally runnable: `./gradlew run` opens the dashboard window for manual
// visual inspection. The lane's compile admission is
// `./gradlew compileKotlin --no-daemon` — the same rung as the settings lane.
//
// The app installs the FSDS theme runtime — semantic defaults from the token
// graph, resolved by generated components through LocalFsdsTheme — and
// bridges it into MaterialTheme so the NOT FSDS fallback chrome renders in
// the same system as FSDS components (mirrors the settings lane's Main.kt).

package com.fullstackds.examples.operationsdashboard

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.fullstackds.examples.operationsdashboard.ui.OperationsDashboardApp
import com.fullstackds.tokens.FsdsSemanticDefaults
import com.fullstackds.tokens.FsdsTheme
import com.fullstackds.tokens.FsdsThemeProvider
import com.fullstackds.tokens.fsdsMaterialColorScheme

fun main() = application {
    Window(
        title = "FSDS Operations Dashboard — Compose lane",
        onCloseRequest = ::exitApplication,
        state = rememberWindowState(width = 1360.dp, height = 860.dp),
    ) {
        FsdsThemeProvider(FsdsTheme(FsdsSemanticDefaults.light)) {
            MaterialTheme(colorScheme = fsdsMaterialColorScheme()) {
                OperationsDashboardApp(Modifier.padding(16.dp))
            }
        }
    }
}
