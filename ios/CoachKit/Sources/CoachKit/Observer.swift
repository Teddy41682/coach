import Foundation

/// The coach's eyes between turns: a look every 2.5 s, logging what's new, speaking up only for a clear mistake —
/// and noticing when the cook has stepped away, so it holds the place, goes quiet and nearly stops spending until
/// they're back. His words: "someone professional with me… I should be able to walk away, leave for an hour, come
/// back and pick up right where we left off."
@MainActor
public final class Observer {
  public enum Presence: Equatable, Sendable { case present, away }
  /// Something to say: a mistake seen, the place held, or a welcome back.
  public enum Output: Equatable, Sendable { case interject(String), away(String), back(String) }

  static let cadence = 2.5
  static let awayCadence = 30.0
  static let awayAfter = 3
  static let interjectSpacing = 20.0

  public private(set) var log: ObservationLog
  public private(set) var presence = Presence.present
  public private(set) var looks = 0
  /// What the looks really cost so far, by the model's own counts.
  public private(set) var cents = 0.0
  /// Every look as it lands — the recorder's feed.
  public var onLook: ((ObserveResult) -> Void)?

  private let sessionId: String
  private let steps: [LinkedStep]
  private let observe: (ObserveRequest) async throws -> ObserveResult
  private let frame: () -> String?
  private let now: () -> Date
  private var inFlight = false
  private var lastLookAt: Date?
  private var lastInterjectAt: Date?
  private var previous: String?
  private var awayStreak = 0

  /// - Parameters:
  ///   - observe: one look at the Worker.
  ///   - frame: the newest frame, downscaled, as base64 JPEG (nil when there's none yet).
  public init(sessionId: String, steps: [LinkedStep], start: Date,
              observe: @escaping (ObserveRequest) async throws -> ObserveResult,
              frame: @escaping () -> String?, now: @escaping () -> Date = Date.init) {
    self.sessionId = sessionId; self.steps = steps; self.log = ObservationLog(start: start)
    self.observe = observe; self.frame = frame; self.now = now
  }

  /// Called often (a timer); looks only when it's time, nothing is in flight and the cook isn't paused (a timer is
  /// running, or the recipe is finished). `current` is read after the answer arrives: an interjection is dropped
  /// if the step has moved on or someone is talking — never queued.
  public func tick(step: Int, paused: Bool, current: () -> (step: Int, busy: Bool)) async -> Output? {
    let interval = presence == .away ? Self.awayCadence : Self.cadence
    if inFlight || paused { return nil }
    if let last = lastLookAt, now().timeIntervalSince(last) < interval { return nil }
    guard let f = frame() else { return nil }
    inFlight = true; lastLookAt = now()
    defer { inFlight = false }
    let req = ObserveRequest(sessionId: sessionId, stepIndex: step, frame: f, previous: previous, recent: log.recent())
    guard let r = try? await observe(req) else { return nil }
    previous = f
    looks += 1; cents += r.usage.cents
    log.append(r.events, at: now(), step: step)
    onLook?(r)

    if r.away {
      awayStreak += 1
      if presence == .present && awayStreak >= Self.awayAfter {
        presence = .away
        return .away("Looks like you've stepped away. I'll hold our place at step \(step + 1) — come back when you're ready.")
      }
      return nil
    }
    awayStreak = 0
    if presence == .away { presence = .present; return .back(recap(step)) }

    guard let line = r.interject else { return nil }
    let state = current()
    if state.step != step || state.busy { return nil }
    if let last = lastInterjectAt, now().timeIntervalSince(last) < Self.interjectSpacing { return nil }
    lastInterjectAt = now()
    return .interject(line)
  }

  /// The cook spoke: if they'd stepped away, they're back — here's where we were.
  public func returned(step: Int) -> String? {
    guard presence == .away else { return nil }
    presence = .present; awayStreak = 0; lastLookAt = nil
    return recap(step)
  }

  private func recap(_ step: Int) -> String {
    var line = "Welcome back. We're on step \(step + 1)"
    if steps.indices.contains(step) { line += ": \(steps[step].text)" } else { line += "." }
    let done = log.onStep(step).suffix(3)
    if !done.isEmpty { line += " So far: \(done.joined(separator: ", "))." }
    return line
  }
}
