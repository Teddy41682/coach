import Foundation

/// Decides when the cook has finished speaking, from the recogniser's running partial transcript, and ignores the
/// coach's own voice: anything heard while it talks, or within `echo` after it stops, is dropped.
public struct Endpointer: Sendable {
  /// 0.8 s split "How much… of a pickle" into two questions on his second cook; people pause mid-sentence.
  public var silence: TimeInterval = 1.1
  public var echo: TimeInterval = 0.3
  private var partial = ""
  private var lastHeard: Date?
  private var coachStoppedAt = Date.distantPast

  public init() {}

  /// True while the cook is mid-sentence (words heard, not yet finished) — the coach must not talk over them.
  public var isHearing: Bool { lastHeard != nil }

  public mutating func coachStopped(at date: Date) { coachStoppedAt = date }

  public mutating func heard(_ text: String, at date: Date, coachTalking: Bool) {
    guard !coachTalking, date.timeIntervalSince(coachStoppedAt) >= echo - 0.001 else { return }
    partial = text
    lastHeard = date
  }

  /// The finished utterance once `silence` has passed since the last change; nil otherwise. Each one only once.
  public mutating func tick(at date: Date) -> String? {
    // A millisecond of slack: 1.3 − 0.5 is 0.7999… in floating point.
    guard let last = lastHeard, date.timeIntervalSince(last) >= silence - 0.001 else { return nil }
    let done = partial.trimmingCharacters(in: .whitespacesAndNewlines)
    partial = ""; lastHeard = nil
    return done.isEmpty ? nil : done
  }
}
