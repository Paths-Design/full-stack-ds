import org.gradle.api.tasks.testing.Test

// Generated-component library. `library/src/main/kotlin/com/fullstackds/components`
// is the codegen components root — `pnpm run generate -- --target=jetpack-compose`
// writes `<Name>/<Name>.kt` there against the Material 3 surface compiled below.

plugins {
    kotlin("jvm")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.compose")
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    implementation(compose.runtime)
    implementation(compose.foundation)
    implementation(compose.animation)
    implementation(compose.material3)
    testImplementation(kotlin("test"))
    testImplementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
    // Semantics-tree tests drive generated composables headlessly
    // (runComposeUiTest); the host's skiko runtime renders them.
    @OptIn(org.jetbrains.compose.ExperimentalComposeLibrary::class)
    testImplementation(compose.uiTest)
    testImplementation(compose.desktop.currentOs)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
    systemProperty(
        "fsds.nativeTokenResolverFixture",
        rootProject.projectDir.parentFile
            .resolve("ds-contracts/fixtures/native-token-resolver.conformance.json")
            .absolutePath,
    )
}
