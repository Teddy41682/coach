import CoachGlasses
import CoachKit
import SwiftUI

@main
struct CoachDemoApp: App {
  init() { try? GlassesDevice.configure() }

  var body: some Scene {
    WindowGroup {
      PickView()
        .onOpenURL { url in Task { await GlassesDevice.handle(url) } }
    }
  }
}

/// Glasses or phone, then cook the bundled recipe (his own gluten-free boule).
struct PickView: View {
  @State private var runner: CoachRunner?

  private func begin(_ device: CoachDevice) {
    let info = Bundle.main.infoDictionary ?? [:]
    let client = CoachClient(
      base: URL(string: info["CoachWorkerURL"] as? String ?? "")!,
      appKey: info["CoachAppKey"] as? String ?? "",
      device: UIDevice.current.identifierForVendor?.uuidString ?? "unknown")
    runner = CoachRunner(recipe: Recipes.boule, device: device, client: client)
  }

  var body: some View {
    if let runner {
      CoachView(runner: runner)
    } else {
      VStack(spacing: 16) {
        Text(Recipes.boule.title).font(.title.weight(.semibold))
        Button("Cook with my glasses") { begin(GlassesDevice()) }.buttonStyle(.borderedProminent)
        Button("Cook with the phone camera") { begin(PhoneDevice()) }.buttonStyle(.bordered)
      }
      .padding()
    }
  }
}
