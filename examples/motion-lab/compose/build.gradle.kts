// Motion-lab example — jetpack-compose native lane (EXAMPLES-MOTION-LAB-01).
// Desktop (JVM) Compose app consuming the generated ds-jetpack-compose package
// via composite-build substitution, timed entirely by lane-local generated
// token constants from the committed token graph.

plugins {
    kotlin("jvm") version "2.1.20"
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.20"
    id("org.jetbrains.compose") version "1.8.0"
    application
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    implementation("ds-jetpack-compose:library")
    implementation(compose.desktop.currentOs)
    implementation(compose.material3)
    implementation(compose.foundation)
}

application {
    mainClass.set("com.fullstackds.examples.motionlab.MainKt")
}
