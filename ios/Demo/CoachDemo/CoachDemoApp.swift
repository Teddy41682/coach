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
  @State private var record = true

  private func begin(_ device: CoachDevice) {
    let info = Bundle.main.infoDictionary ?? [:]
    let client = CoachClient(
      base: URL(string: info["CoachWorkerURL"] as? String ?? "")!,
      appKey: info["CoachAppKey"] as? String ?? "",
      device: UIDevice.current.identifierForVendor?.uuidString ?? "unknown")
    runner = CoachRunner(recipe: Recipes.boule, device: device, client: client, recorder: record ? try? SessionRecorder() : nil)
  }

  var body: some View {
    if let runner {
      CoachView(runner: runner)
    } else {
      VStack(spacing: 16) {
        Text(Recipes.boule.title).font(.title.weight(.semibold))
        Toggle("Record this session", isOn: $record).fixedSize()
        // Recording streams at 15 fps for smooth video; the coach still looks at 2 a second either way.
        Button("Cook with my glasses") { begin(GlassesDevice(fps: record ? 15 : 2)) }.buttonStyle(.borderedProminent)
        Button("Cook with the phone camera") { begin(PhoneDevice(fps: record ? 15 : 2)) }.buttonStyle(.bordered)
      }
      .padding()
    }
  }
}
