rootProject.name = "motion-lab-compose-example"

// Consumer boundary: substitute the generated DS package's library module
// for the `ds-jetpack-compose:library` coordinates declared in build.gradle.kts.
// The example compiles ONLY through the package's public exports.
includeBuild("../../../packages/ds-jetpack-compose")

dependencyResolutionManagement {
    repositories {
        mavenCentral()
        // androidx transitive artifacts of the Compose desktop runtime
        // (e.g. lifecycle-common) publish to Google's Maven, not Central.
        google()
    }
}
