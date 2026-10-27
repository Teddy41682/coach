// swift-tools-version: 6.0
import PackageDescription

// The coach's logic, networking and voice helpers: no Meta toolkit here, so it builds and tests on the Mac
// (`swift test`) without a simulator. The glasses live in the iOS-only CoachGlasses package.
let package = Package(
  name: "CoachKit",
  platforms: [.iOS("17.2"), .macOS(.v14)],
  products: [.library(name: "CoachKit", targets: ["CoachKit"])],
  targets: [
    .target(name: "CoachKit"),
    .testTarget(name: "CoachKitTests", dependencies: ["CoachKit"]),
  ]
)
