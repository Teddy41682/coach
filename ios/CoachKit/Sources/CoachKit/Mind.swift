import Foundation

/// The coach's one mind, as the phone drives it: the eyes decide *when* to wake it, the model decides *what* — if
/// anything — to say, and whether the step stays, moves on or is held. The phone keeps the timeline and the
/// guardrails, nothing more: no away/back counters, no line spacing beyond the guardrails (his words, 2026-10-27:
/// "something smart enough to know… this is what I should say, just like a human would").
@MainActor
public final class Mind {
  /// What the cook and coach are doing right now, read when a wake is due and again when its answer lands.
  public struct Now: Sendable {
    public var step: Int
    public var finished: Bool
    public var cookSpeaking: Bool
    public var coachSpeaking: Bool
    /// A spoken turn is in flight (from the cook's words to the end of the answer): the one call in flight.
    public var turnActive: Bool
    /// On the recipe's last step: the eyes may say it looks done, but finishing the recipe takes the cook's word.
    public var lastStep: Bool
    public init(step: Int, finished: Bool, cookSpeaking: Bool, coachSpeaking: Bool, turnActive: Bool = false, lastStep: Bool = false) {
      self.step = step; self.finished = finished; self.cookSpeaking = cookSpeaking; self.coachSpeaking = coachSpeaking
      self.turnActive = turnActive; self.lastStep = lastStep
    }
  }
  /// What to do with an answer: say this (if anything), then this with the step.
  public struct Outcome: Equatable, Sendable { public let say: String?; public let step: StepCall }

  public private(set) var timeline: Timeline
  public private(set) var held = false
  public private(set) var wakes = 0
  /// What the eye wakes really cost so far, by the model's own counts.
  public private(set) var cents = 0.0
  /// True once the Worker refused (the day's cap) or the cook's spend cap was reached: the eyes close for this cook.
  public private(set) var stopped = false
  /// Every eye wake as it lands — the recorder's feed.
  public var onWake: ((WakeReason, MindAnswer) -> Void)?

  private let sessionId: String
  private let call: (MindRequest) async throws -> MindAnswer
  private let frame: () -> (jpeg: Data, thumb: Thumb)?
  private let encode: (Data) -> String?
  private let now: () -> Date
  private var eyes = Eyes()
  private var guardrails = Guardrails()
  private var inFlight = false
  private var pending: WakeReason?
  private var previous: String?
  private var lastSpeech: Date
  private var lastCookSpoke: Date = .distantPast

  /// - Parameters:
  ///   - call: one eye wake at the Worker (`CoachClient.mind`).
  ///   - frame: the newest frame and its thumbnail (nil when there's none yet).
  ///   - encode: a frame as the mind is shown it (downscaled base64 JPEG).
  public init(sessionId: String, start: Date,
              call: @escaping (MindRequest) async throws -> MindAnswer,
              frame: @escaping () -> (jpeg: Data, thumb: Thumb)?,
              encode: @escaping (Data) -> String? = { downscaleJPEG($0)?.base64EncodedString() },
              now: @escaping () -> Date = Date.init) {
    self.sessionId = sessionId; self.timeline = Timeline(start: start)
    self.call = call; self.frame = frame; self.encode = encode; self.now = now
    self.lastSpeech = start
  }

  /// Adds to the timeline what someone said or what happened; speech restarts the quiet.
  public func note(_ kind: Timeline.Kind, _ text: String) {
    timeline.add(kind, text, at: now())
    if kind == .cook || kind == .coach { lastSpeech = now() }
  }

  /// The cook spoke to the coach (their words are a spoken wake of the same mind): they're here, the heartbeat
  /// restarts, and any eye answer still in flight is stale.
  public func cookSpoke(at date: Date, showing thumb: Thumb?) {
    lastCookSpoke = date; lastSpeech = date
    eyes.woke(at: date, showing: thumb, eye: false)
    if held { held = false; timeline.add(.note, "the cook is back", at: date) }
  }

  /// A spoken answer's decision to hold the place (the cook said they're stepping away).
  public func holdPlace(step: Int) {
    guard !held else { return }
    held = true
    timeline.add(.note, "place held at step \(step + 1)", at: now())
  }

  /// Wake at the next tick whatever the picture (a timer ended).
  public func wakeNow(_ reason: WakeReason) { pending = reason }

  /// Called twice a second. Wakes the mind if the eyes say so and nothing is in flight; returns what to do with its
  /// answer, already through the guardrails — or nil.
  public func tick(_ state: () -> Now) async -> Outcome? {
    var s = state()
    if s.coachSpeaking || s.cookSpeaking { lastSpeech = now() }
    if stopped || s.finished || inFlight || s.turnActive { return nil }
    guard let f = frame() else { return nil }
    let t = now()
    let seenReason = eyes.look(f.thumb, at: t, busy: false)
    guard let reason = pending ?? seenReason else { return nil }
    pending = nil
    guard let jpeg = encode(f.jpeg) else { return nil }
    eyes.woke(at: t, showing: f.thumb)
    var req = MindRequest(sessionId: sessionId, stepIndex: s.step, wake: reason, timeline: timeline.lines(),
                          quietFor: max(0, t.timeIntervalSince(lastSpeech)).rounded())
    req.held = held; req.frame = jpeg; req.previous = previous
    inFlight = true
    defer { inFlight = false }
    let answer: MindAnswer
    do { answer = try await call(req) } catch {
      if error is CoachClient.Refused { stopped = true }
      return nil
    }
    previous = jpeg
    wakes += 1; cents += answer.usage.cents
    if cents >= Guardrails.centsCap { stopped = true }
    for e in answer.seen { timeline.add(.saw, e, at: t) }
    onWake?(reason, answer)

    // Read again now the answer is here: a line about a step already left, or after the cook spoke, is dropped.
    s = state()
    if s.step != req.stepIndex || lastCookSpoke > t || s.turnActive { return nil }
    var say = answer.say, step = answer.step
    if step == .next && s.lastStep { step = .stay }
    if say != nil || step == .next {
      let landed = now()
      if guardrails.allows(at: landed, cookSpeaking: s.cookSpeaking, coachSpeaking: s.coachSpeaking, finished: s.finished) {
        if say != nil { guardrails.spoke(at: landed) }
      } else {
        say = nil
        if step == .next { step = .stay }
      }
    }
    if step == .hold { holdPlace(step: s.step) } else if held {
      held = false
      timeline.add(.note, "the cook is back", at: now())
    }
    return say == nil && step == .stay && answer.step != .hold ? nil : Outcome(say: say, step: step)
  }
}
