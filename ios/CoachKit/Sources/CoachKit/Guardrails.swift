import Foundation

/// The only rules the coach keeps — everything else is the mind's judgement (spec 2026-10-27, eyes and one mind):
/// never speak over the cook or over itself, never more than one unprompted line per 20 s, nothing unprompted once the
/// recipe is finished, and never past the spend cap.
public struct Guardrails: Sendable {
  public static let spacing = 20.0
  /// What one cook's eye wakes may spend, in cents, before the eyes close (the Worker's daily cap still stands behind it).
  public static let centsCap = 100.0
  private var last: Date = .distantPast

  public init() {}

  public func allows(at now: Date, cookSpeaking: Bool, coachSpeaking: Bool, finished: Bool) -> Bool {
    !(cookSpeaking || coachSpeaking || finished) && now.timeIntervalSince(last) >= Self.spacing - 1e-6
  }

  public mutating func spoke(at now: Date) { last = now }
}
