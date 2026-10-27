import Foundation
import Testing
@testable import CoachKit

/// Against the real Worker. Runs only with COACH_KEY set: `COACH_KEY=… swift test --filter LiveTests`.
@Suite(.enabled(if: ProcessInfo.processInfo.environment["COACH_KEY"] != nil)) struct LiveTests {
  let client = CoachClient(
    base: URL(string: "https://coach.teddy41682.workers.dev")!,
    appKey: ProcessInfo.processInfo.environment["COACH_KEY"] ?? "", device: "coachkit-live-test")

  @Test func startsASessionAndStreamsATurn() async throws {
    let recipe = CoachRecipe(title: "Scrambled eggs", ingredients: [.init(amount: "3", item: "eggs"), .init(amount: "1 knob", item: "butter")],
                             steps: ["Melt the butter on a low heat.", "Add the beaten eggs and stir slowly."])
    let (sessionId, steps) = try await client.start(recipe)
    #expect(steps.count == 2)
    #expect(steps[1].ingredients.contains("eggs"))
    var events: [CoachEvent] = []
    for try await e in client.turn(TurnRequest(sessionId: sessionId, stepIndex: 1, utterance: "How long should I stir for?", frames: [], seen: [])) {
      events.append(e)
    }
    #expect(events.last == .done)
    #expect(events.contains { if case .text = $0 { true } else { false } })
    print("LIVE:", events)
  }
}
