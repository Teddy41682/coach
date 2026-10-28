#if os(iOS)
import SwiftUI

/// The coach's screen: mostly for the phone propped up, since glasses-first means the voice does the work.
public struct CoachView: View {
  @State private var runner: CoachRunner
  public init(runner: CoachRunner) { _runner = State(initialValue: runner) }

  private var label: String {
    switch runner.activity {
    case .starting: "Starting…"
    case .listening: "Listening"
    case .thinking: "Looking…"
    case .speaking: "Speaking"
    case .stopped(let why): why
    }
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      HStack {
        Text(label).font(.headline).foregroundStyle(.secondary)
        Spacer()
        if runner.recorder != nil { Label("REC", systemImage: "record.circle.fill").font(.caption.weight(.bold)).foregroundStyle(.red) }
      }
      if runner.stepNumber > 0 {
        Text("Step \(runner.stepNumber)").font(.caption.weight(.semibold)).textCase(.uppercase).foregroundStyle(.secondary)
        Text(runner.stepText).font(.title2)
      }
      if !runner.lastHeard.isEmpty {
        Text("Heard: “\(runner.lastHeard)”").font(.callout).foregroundStyle(.secondary)
      }
      if !runner.deviceNote.isEmpty { Text(runner.deviceNote).font(.callout).foregroundStyle(.orange) }
      Spacer()
      #if DEBUG
      if let t = runner.lastResponse { Text(String(format: "Last response: %.1f s", t)).font(.caption.monospaced()) }
      if runner.away { Text("Away — holding step \(runner.stepNumber)").font(.callout).foregroundStyle(.secondary) }
      Text(String(format: "Mind: %d wakes · %.1f¢", runner.looks, runner.observeCents)).font(.caption.monospaced())
      #endif
      Button("Stop") { runner.stop() }.buttonStyle(.bordered)
    }
    .padding(24)
    .task { await runner.start() }
    .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
    .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
  }
}
#endif
