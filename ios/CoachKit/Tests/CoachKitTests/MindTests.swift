import Foundation
import Testing
@testable import CoachKit

@Suite struct GuardrailsTests {
  let t0 = Date(timeIntervalSince1970: 1_000)

  /// No spacing between lines (his third PB&J): only never over the cook, never over itself, nothing after finishing.
  @Test func neverOverTheCookOrItselfAndNotAfterFinishingButNoForcedQuiet() {
    let g = Guardrails()
    #expect(!g.allows(cookSpeaking: true, coachSpeaking: false, finished: false))
    #expect(!g.allows(cookSpeaking: false, coachSpeaking: true, finished: false))
    #expect(!g.allows(cookSpeaking: false, coachSpeaking: false, finished: true))
    #expect(g.allows(cookSpeaking: false, coachSpeaking: false, finished: false))
  }
}

/// A hand-driven mind: the clock, the picture and the model's answers are set per test.
@MainActor final class MindRig {
  var now: Double = 0
  var thumb: Thumb? = Thumb(pixels: Array(repeating: 100, count: 64))
  var answers: [MindAnswer] = []
  var sent: [MindRequest] = []
  var failWith: Error?
  var gate: CheckedContinuation<Void, Never>?
  var hold = false
  var state = Mind.Now(step: 0, finished: false, cookSpeaking: false, coachSpeaking: false)

  static let other = Thumb(pixels: Array(repeating: 0, count: 32) + Array(repeating: 200, count: 32))
  static func answer(_ seen: [String] = [], say: String? = nil, step: StepCall = .stay) -> MindAnswer {
    MindAnswer(seen: seen, say: say, step: step, usage: ObserveUsage(input: 1_000, cachedInput: 0, output: 300))
  }

  func mind() -> Mind {
    Mind(
      sessionId: "s1", start: Date(timeIntervalSince1970: 0),
      call: { [unowned self] req in
        self.sent.append(req)
        if self.hold { await withCheckedContinuation { self.gate = $0 } }
        if let e = self.failWith { throw e }
        return self.answers.isEmpty ? MindRig.answer() : self.answers.removeFirst()
      },
      frame: { [unowned self] in self.thumb.map { (jpeg: Data("J\(self.now)".utf8), thumb: $0) } },
      encode: { String(decoding: $0, as: UTF8.self) },
      now: { [unowned self] in Date(timeIntervalSince1970: self.now) })
  }

  /// Ticks at `t` with the rig's state.
  func tick(_ m: Mind, at t: Double) async -> Mind.Outcome? {
    now = t
    return await m.tick { self.state }
  }
}

@MainActor @Suite struct MindTests {
  @Test func theFirstLookWakesItWithTheTimelineAndNoPrevious() async {
    let rig = MindRig(); let m = rig.mind()
    m.note(.coach, "Step 1: Put the bread in the toaster.")
    _ = await rig.tick(m, at: 1)
    #expect(rig.sent.count == 1)
    #expect(rig.sent[0].wake == .changed && rig.sent[0].previous == nil && rig.sent[0].frame == "J1.0")
    #expect(rig.sent[0].timeline == ["0:00 coach: Step 1: Put the bread in the toaster."])
  }

  @Test func whatItSeesJoinsTheTimelineAndThePreviousLookTravelsNext() async {
    let rig = MindRig(); let m = rig.mind()
    rig.answers = [MindRig.answer(["put two slices in"])]
    _ = await rig.tick(m, at: 1)
    rig.thumb = MindRig.other
    for t in [4.0, 4.5, 5.0] { _ = await rig.tick(m, at: t) }
    #expect(rig.sent.count == 2)
    #expect(rig.sent[1].previous == "J1.0" && rig.sent[1].frame == "J5.0")
    #expect(rig.sent[1].timeline.contains("0:01 saw: put two slices in"))
    #expect(m.wakes == 2 && m.cents > 0)
  }

  @Test func saysWhatTheMindDecidesWhenNobodyIsTalking() async {
    let rig = MindRig(); let m = rig.mind()
    rig.answers = [MindRig.answer(say: "The pan's still cold.")]
    #expect(await rig.tick(m, at: 1) == Mind.Outcome(say: "The pan's still cold.", step: .stay))
  }

  @Test func neverSpeaksOverTheCookAndDropsTheMoveOnWithIt() async {
    let rig = MindRig(); let m = rig.mind()
    rig.answers = [MindRig.answer(say: "Bread's in.", step: .next)]
    rig.state.cookSpeaking = true
    #expect(await rig.tick(m, at: 1) == nil)
  }

  @Test func anAnswerAboutAStepAlreadyLeftIsDropped() async {
    let rig = MindRig(); let m = rig.mind()
    rig.hold = true
    let first = Task { await rig.tick(m, at: 1) }
    while rig.gate == nil { await Task.yield() }
    rig.state.step = 1
    rig.answers = [MindRig.answer(say: "Cold pan.")]
    rig.gate?.resume()
    #expect(await first.value == nil)
  }

  @Test func anAnswerLandingAfterTheCookSpokeIsDropped() async {
    let rig = MindRig(); let m = rig.mind()
    rig.hold = true
    let first = Task { await rig.tick(m, at: 1) }
    while rig.gate == nil { await Task.yield() }
    m.cookSpoke(at: Date(timeIntervalSince1970: 1.5), showing: nil)
    rig.answers = [MindRig.answer(say: "Cold pan.")]
    rig.gate?.resume()
    #expect(await first.value == nil)
  }

  @Test func neverTwoCallsInFlight() async {
    let rig = MindRig(); let m = rig.mind()
    rig.hold = true
    let first = Task { await rig.tick(m, at: 1) }
    while rig.gate == nil { await Task.yield() }
    _ = await rig.tick(m, at: 40)
    #expect(rig.sent.count == 1)
    rig.gate?.resume(); _ = await first.value
  }

  @Test func noEyeWakeWhileASpokenTurnIsInFlight() async {
    let rig = MindRig(); let m = rig.mind()
    rig.state.turnActive = true
    _ = await rig.tick(m, at: 1)
    #expect(rig.sent.isEmpty)
  }

  @Test func anAnswerLandingDuringASpokenTurnIsDropped() async {
    let rig = MindRig(); let m = rig.mind()
    rig.hold = true
    let first = Task { await rig.tick(m, at: 1) }
    while rig.gate == nil { await Task.yield() }
    rig.state.turnActive = true
    rig.answers = [MindRig.answer(say: "Cold pan.", step: .next)]
    rig.gate?.resume()
    #expect(await first.value == nil)
  }

  /// His third PB&J: on the last step the mind said "two clean halves — done" twice and the recipe never ended; seeing
  /// the last step done now finishes it, like any other step.
  @Test func theEyesMayFinishTheRecipe() async {
    let rig = MindRig(); let m = rig.mind()
    rig.answers = [MindRig.answer(say: "That's done.", step: .next)]
    #expect(await rig.tick(m, at: 1) == Mind.Outcome(say: "That's done.", step: .next))
  }

  /// Two lines a few seconds apart both get said: nothing holds the second back.
  @Test func linesAFewSecondsApartAreBothSaid() async {
    let rig = MindRig(); let m = rig.mind()
    rig.answers = [MindRig.answer(say: "Keep it light.", step: .stay)]
    #expect(await rig.tick(m, at: 1)?.say == "Keep it light.")
    rig.thumb = MindRig.other
    rig.answers = [MindRig.answer(say: "Leave a little border.", step: .stay)]
    var said: String?
    for t in stride(from: 1.5, through: 9, by: 0.5) where said == nil { said = await rig.tick(m, at: t)?.say }
    #expect(said == "Leave a little border.")
  }

  @Test func nothingUnpromptedOnceFinished() async {
    let rig = MindRig(); let m = rig.mind()
    rig.state.finished = true
    _ = await rig.tick(m, at: 1)
    #expect(rig.sent.isEmpty)
  }

  @Test func holdingThePlaceIsTheMindsCallAndNotedInTheTimeline() async {
    let rig = MindRig(); let m = rig.mind()
    rig.answers = [MindRig.answer(say: "I'll hold our place.", step: .hold), MindRig.answer(step: .hold), MindRig.answer(say: "Welcome back.")]
    #expect(await rig.tick(m, at: 1) == Mind.Outcome(say: "I'll hold our place.", step: .hold))
    #expect(m.held)
    #expect(await rig.tick(m, at: 31) == Mind.Outcome(say: nil, step: .hold))
    #expect(rig.sent[1].held == true)
    #expect(await rig.tick(m, at: 61) == Mind.Outcome(say: "Welcome back.", step: .stay))
    #expect(!m.held)
    #expect(m.timeline.lines().contains("0:01 note: place held at step 1"))
  }

  @Test func theCookSpeakingMeansTheyreHere() async {
    let rig = MindRig(); let m = rig.mind()
    rig.answers = [MindRig.answer(step: .hold)]
    _ = await rig.tick(m, at: 1)
    m.cookSpoke(at: Date(timeIntervalSince1970: 5), showing: nil)
    #expect(!m.held)
  }

  @Test func aTimerEndingWakesItAtOnce() async {
    let rig = MindRig(); let m = rig.mind()
    _ = await rig.tick(m, at: 1)
    m.wakeNow(.timer)
    _ = await rig.tick(m, at: 1.5)
    #expect(rig.sent.last?.wake == .timer)
  }

  @Test func aRefusalStopsTheEyesForTheRestOfTheCook() async {
    let rig = MindRig(); let m = rig.mind()
    rig.failWith = CoachClient.Refused(status: 429)
    _ = await rig.tick(m, at: 1)
    rig.failWith = nil
    _ = await rig.tick(m, at: 40)
    #expect(rig.sent.count == 1)
    #expect(m.stopped)
  }

  @Test func aPassingFailureIsSilentAndTheEyesCarryOn() async {
    let rig = MindRig(); let m = rig.mind()
    rig.failWith = URLError(.notConnectedToInternet)
    #expect(await rig.tick(m, at: 1) == nil)
    rig.failWith = nil
    _ = await rig.tick(m, at: 40)
    #expect(rig.sent.count == 2)
  }

  @Test func stopsWakingPastTheSpendCap() async {
    let rig = MindRig(); let m = rig.mind()
    rig.answers = [MindAnswer(seen: [], say: nil, step: .stay, usage: ObserveUsage(input: 0, cachedInput: 0, output: 300_000))]
    _ = await rig.tick(m, at: 1)          // 127.5¢ — over the cook's cap
    _ = await rig.tick(m, at: 40)
    #expect(rig.sent.count == 1)
  }

  @Test func tellsTheMindHowLongItsBeenQuiet() async {
    let rig = MindRig(); let m = rig.mind()
    rig.now = 2; m.note(.cook, "is it hot?")
    _ = await rig.tick(m, at: 10)
    #expect(rig.sent[0].quietFor == 8)
  }
}
