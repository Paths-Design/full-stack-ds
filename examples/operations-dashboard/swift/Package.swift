// swift-tools-version:6.0
import PackageDescription

// Operations dashboard — swift lane (examples/operations-dashboard/swift).
//
// Consumer-boundary seam: the app target compiles only through the public
// `DsSwiftUI` export surface, reached via a local package-path dependency
// into the monorepo's generated SwiftUI package (mirrors
// examples/settings/swift). The seam target owns the lane-local port of the
// data/API layer (fixtures + adapter + functional API) and its resources;
// the app target must not read fixtures directly.

let package = Package(
    name: "operations-dashboard-swift-example",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "OperationsDashboardExample", targets: ["OperationsDashboard"])
    ],
    dependencies: [
        // Local path dependency into the monorepo's generated SwiftUI package.
        .package(path: "../../../packages/ds-swiftui")
    ],
    targets: [
        // Lane-local data/API seam: the only fixture-shape reader. UI code
        // imports the API surface only.
        .target(
            name: "OperationsDashboardSeam",
            resources: [
                // Lane-owned verbatim copies of examples/operations-dashboard/fixtures.
                .copy("Fixtures")
            ]
        ),
        .executableTarget(
            name: "OperationsDashboard",
            dependencies: [
                .product(name: "DsSwiftUI", package: "ds-swiftui"),
                "OperationsDashboardSeam"
            ]
        ),
        .testTarget(
            name: "OperationsDashboardTests",
            dependencies: [
                "OperationsDashboardSeam",
                // The app module too: the responsive shell arithmetic
                // (ShellTier/ShellLayout/QueueColumns) is spec-pinned and
                // unit-tested (ShellLayoutTests).
                "OperationsDashboard"
            ]
        )
    ]
)
