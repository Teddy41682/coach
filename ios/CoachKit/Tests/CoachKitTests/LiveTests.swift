import CoreGraphics
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

  /// One eye wake and one spoken wake of the mind, as the runner sends them — with a real downscaled frame.
  @Test func wakesTheMindByEyeAndByVoice() async throws {
    let recipe = CoachRecipe(title: "Toast", ingredients: [.init(amount: "2 slices", item: "bread")], steps: ["Put the bread in the toaster."])
    let (sessionId, _) = try await client.start(recipe)
    let frame = try #require(downscaleJPEG(greyJPEG(block: CGRect(x: 0, y: 0, width: 200, height: 300)))?.base64EncodedString())
    var eye = MindRequest(sessionId: sessionId, stepIndex: 0, wake: .changed,
                          timeline: ["0:01 coach: Let's make Toast. Step 1: Put the bread in the toaster."], quietFor: 4)
    eye.frame = frame
    let answer = try await client.mind(eye)
    #expect(answer.usage.output > 0)
    print("LIVE eye:", answer)
    var spoken = MindRequest(sessionId: sessionId, stepIndex: 0, wake: .spoke,
                             timeline: ["0:05 cook: how many slices?"], quietFor: 0)
    spoken.utterance = "how many slices?"; spoken.frames = [frame]
    var events: [CoachEvent] = []
    for try await e in client.mindTurn(spoken) { events.append(e) }
    #expect(events.last == .done)
    #expect(events.contains { if case .action = $0 { true } else { false } })
    print("LIVE spoken:", events)
  }

  @Test func aRefusedWakeThrowsRefused() async throws {
    let req = MindRequest(sessionId: "not-a-session", stepIndex: 0, wake: .heartbeat, timeline: [], quietFor: 0)
    await #expect(throws: CoachClient.Refused(status: 404)) { try await client.mind(req) }
  }
}
