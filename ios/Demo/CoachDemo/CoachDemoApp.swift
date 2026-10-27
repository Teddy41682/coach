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

/// Pick a dish, glasses or phone, then cook it.
struct PickView: View {
  @State private var runner: CoachRunner?
  @State private var record = true
  @State private var pick = 0

  private func begin(_ device: CoachDevice) {
    let info = Bundle.main.infoDictionary ?? [:]
    let client = CoachClient(
      base: URL(string: info["CoachWorkerURL"] as? String ?? "")!,
      appKey: info["CoachAppKey"] as? String ?? "",
      device: UIDevice.current.identifierForVendor?.uuidString ?? "unknown")
    runner = CoachRunner(recipe: Recipes.all[pick], device: device, client: client, recorder: record ? try? SessionRecorder() : nil)
  }

  var body: some View {
    if let runner {
      CoachView(runner: runner)
    } else {
      VStack(spacing: 16) {
        Picker("Recipe", selection: $pick) {
          ForEach(Recipes.all.indices, id: \.self) { Text(Recipes.all[$0].title).tag($0) }
        }
        .pickerStyle(.wheel).frame(height: 120)
        Toggle("Record this session", isOn: $record).fixedSize()
        // Recording streams at 15 fps for smooth video; the coach still looks at 2 a second either way.
        Button("Cook with my glasses") { begin(GlassesDevice(fps: record ? 15 : 2)) }.buttonStyle(.borderedProminent)
        Button("Cook with the phone camera") { begin(PhoneDevice(fps: record ? 15 : 2)) }.buttonStyle(.bordered)
      }
      .padding()
    }
  }
}
