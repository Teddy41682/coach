// swift-tools-version: 6.0
import PackageDescription

// The Ray-Ban Meta glasses as the coach's eyes, through Meta's Wearables Device Access Toolkit. Kept apart from
// CoachKit so an App Store build can leave the toolkit out (Meta warns it may cause App Store rejection).
let package = Package(
  name: "CoachGlasses",
  platforms: [.iOS("17.2")],
  products: [.library(name: "CoachGlasses", targets: ["CoachGlasses"])],
  dependencies: [
    .package(path: "../CoachKit"),
    .package(url: "https://github.com/facebook/meta-wearables-dat-ios", exact: "1.0.1"),
  ],
  targets: [
    .target(name: "CoachGlasses", dependencies: [
      "CoachKit",
      .product(name: "MWDATCore", package: "meta-wearables-dat-ios"),
      .product(name: "MWDATCamera", package: "meta-wearables-dat-ios"),
    ]),
  ]
)
