import Foundation

/// The only rules the coach keeps — everything else is the mind's judgement (spec 2026-10-27, eyes and one mind):
/// never speak over the cook or over itself, never more than one unprompted line per 12 s — except to say a step is
/// done and move on, which is never held back — nothing unprompted once the recipe is finished, and never past the
/// spend cap. (20 s, then his second PB&J: a step finished just after an expert touch waited for him to say "done".)
public struct Guardrails: Sendable {
  public static let spacing = 12.0
  /// What one cook's eye wakes may spend, in cents, before the eyes close (the Worker's daily cap still stands behind it).
  public static let centsCap = 100.0
  private var last: Date = .distantPast

  public init() {}

  public func allows(at now: Date, cookSpeaking: Bool, coachSpeaking: Bool, finished: Bool, movingOn: Bool = false) -> Bool {
    !(cookSpeaking || coachSpeaking || finished) && (movingOn || now.timeIntervalSince(last) >= Self.spacing - 1e-6)
  }

  public mutating func spoke(at now: Date) { last = now }
}
