// swift-tools-version:6.0
import PackageDescription

// Motion-lab native lane (EXAMPLES-MOTION-LAB-01). Consumer-boundary seam:
// this executable may use only what `import DsSwiftUI` exposes publicly,
// plus the lane-local generated token constants derived from the committed
// token graph by tools/gen-native-motion-tokens.mjs.
let package = Package(
    name: "motion-lab-swift-example",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "MotionLabExample", targets: ["MotionLab"])
    ],
    dependencies: [
        .package(path: "../../../packages/ds-swiftui")
    ],
    targets: [
        .executableTarget(
            name: "MotionLab",
            dependencies: [
                .product(name: "DsSwiftUI", package: "ds-swiftui")
            ]
        )
    ]
)
