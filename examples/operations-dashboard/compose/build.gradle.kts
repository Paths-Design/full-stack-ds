// Operations dashboard example — jetpack-compose lane
// (EXAMPLES-OPS-DASH-NATIVE-LANES-01).
// Desktop (JVM) Compose app consuming the generated ds-jetpack-compose package
// via composite-build substitution, mirroring the examples/settings/compose
// lane conventions. The data/API seam is a lane-local port of the shared
// fixtures → adapter → functional-API shape (src/main/kotlin .../data + .../api),
// deterministic by construction: fixed latencyMs, explicit failLoads flag,
// no wall-clock randomness on the API path.

plugins {
    kotlin("jvm") version "2.1.20"
    kotlin("plugin.serialization") version "2.1.20"
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.20"
    id("org.jetbrains.compose") version "1.8.0"
    application
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    // FSDS public exports only — the consumer boundary this lane falsifies.
    implementation("ds-jetpack-compose:library")
    implementation(compose.desktop.currentOs)
    implementation(compose.material3)
    implementation(compose.foundation)

    // Data/API seam. Coroutines are pinned to 1.8.0 — the same line the
    // Compose Multiplatform 1.8.0 runtime graph already pulls — rather than
    // a newer artifact, so the lane resolves against the versions this repo's
    // native-compile lane has demonstrably fetched. Serialization parses the
    // lane-owned JSONL/JSON fixture copies.
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")

    testImplementation(kotlin("test"))
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}

application {
    mainClass.set("com.fullstackds.examples.operationsdashboard.MainKt")
}
