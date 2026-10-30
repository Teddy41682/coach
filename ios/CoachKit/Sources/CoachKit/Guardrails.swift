import Foundation

/// The only rules the coach keeps — everything else is the mind's judgement (spec 2026-10-27, eyes and one mind):
/// never speak over the cook or over itself, nothing unprompted once the recipe is finished, and never past the spend
/// cap. No spacing between lines: his third PB&J (2026-10-30) felt the forced quiet — three good lines were held back
/// by a 12 s gap, leaving 18–20 s silences — and he wants it to talk when it has something to say.
public struct Guardrails: Sendable {
  /// What one cook's eye wakes may spend, in cents, before the eyes close (the Worker's daily cap still stands behind it).
  public static let centsCap = 100.0

  public init() {}

  public func allows(cookSpeaking: Bool, coachSpeaking: Bool, finished: Bool) -> Bool {
    !(cookSpeaking || coachSpeaking || finished)
  }
}
