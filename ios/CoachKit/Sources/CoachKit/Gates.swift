import Foundation

/// Decisions taken in code, not left to the model (his ruling 2026-10-31: "programmatic solutions, not just updates to
/// model instructions — deterministic good results"). The model says what it sees and what kind of line it wants to
/// say; these decide whether anything is said. Katie's PB&J — 59 lines in four minutes, the step read back six times
/// in a minute, every aside answered — is what they exist to prevent.

/// What an unprompted line is for, as the mind labels it.
public enum LineKind: String, Codable, Sendable {
  /// Something is going wrong now — always said.
  case mistake
  /// The step is done — always said.
  case done
  /// The cook stepped away or came back — always said.
  case away
  /// A cue while the cook works, a tip or a remark — said only when the gate lets it through.
  case cue, chat

  public init(from decoder: Decoder) throws {
    self = LineKind(rawValue: (try? decoder.singleValueContainer().decode(String.self)) ?? "") ?? .cue
  }

  var isRequired: Bool { self == .mistake || self == .done || self == .away }
}

/// How much of line `a` is already in `b`: the share of `a`'s content words that `b` has, 0–1. Measured from the new
/// line's side, so a short step ("Spread the jelly.") doesn't swallow every cue that names jelly:
/// "push it right out to the edges" against "work it right out to the edges" is 0.5 — the same cue — while
/// "thin layer of jelly" against "Spread the jelly." is 0.33.
public func overlap(_ a: String, _ b: String) -> Double {
  let x = contentWords(a), y = contentWords(b)
  guard !x.isEmpty, !y.isEmpty else { return 0 }
  return Double(x.intersection(y).count) / Double(x.count)
}

private let stopwords: Set<String> = [
  "the", "and", "that", "this", "now", "just", "get", "then", "with", "your", "you", "out", "for", "its", "it's",
  "one", "all", "there", "here", "nice", "good", "right", "that's", "let's", "into", "onto", "over", "keep", "bit", "too", "those", "these", "them", "some", "more", "little",
]

func contentWords(_ s: String) -> Set<String> {
  Set(s.lowercased().components(separatedBy: CharacterSet.letters.inverted)
    .filter { $0.count >= 3 && !stopwords.contains($0) }
    .map { $0.hasSuffix("s") && $0.count > 4 ? String($0.dropLast()) : $0 })
}

/// The gate an unprompted line passes before it is spoken. Mistakes, a finished step and the cook leaving or coming
/// back always pass. A cue or a remark passes only if it is new: not the step read back, not a rewording of anything
/// already said in this step, at least `gap` after the coach last spoke, and within the step's budget.
public struct LineGate: Sendable {
  /// A cue this close to the step's own words is the step read back.
  public static let sameAs = 0.5
  public static let gap: TimeInterval = 6
  public static let perStep = 3

  private var step = -1
  private var saidThisStep: [String] = []
  private var cues = 0
  private var lastSpoke: Date = .distantPast

  public init() {}

  /// Every line the coach speaks, whoever decided it (the phone reading a step, an answer): what's new is judged
  /// against all of it.
  public mutating func spoke(_ line: String, step: Int, at date: Date) {
    enter(step)
    saidThisStep.append(line)
    lastSpoke = date
  }

  public mutating func allows(_ line: String, kind: LineKind, step: Int, stepText: String, at now: Date) -> Bool {
    enter(step)
    if kind.isRequired { return true }
    guard cues < Self.perStep, now.timeIntervalSince(lastSpoke) >= Self.gap - 1e-6 else { return false }
    if overlap(line, stepText) >= Self.sameAs { return false }
    if saidThisStep.contains(where: { overlap(line, $0) >= Self.sameAs }) { return false }
    cues += 1
    return true
  }

  private mutating func enter(_ s: Int) {
    if s != step { step = s; saidThisStep = []; cues = 0 }
  }
}

/// Whether the cook's words were meant for the coach. People in a kitchen talk to each other, mutter and get cut off
/// ("the dirty", "too much", "maybe she thinks I'm dumb"); answering all of it was Katie's train wreck. Said to the
/// coach: anything naming it; any question or request to "you"; and, within `followUp` of the coach speaking, a reply
/// of three words or more. Everything else is an aside: heard, kept for context, not answered.
public enum Addressed {
  public static let followUp: TimeInterval = 8

  public static func toCoach(_ words: String, name: String?, sinceCoachSpoke: TimeInterval) -> Bool {
    let lower = words.lowercased()
    let tokens = lower.components(separatedBy: CharacterSet.letters.union(CharacterSet(charactersIn: "'")).inverted)
      .filter { !$0.isEmpty }
    if let name, tokens.contains(name.lowercased()) { return true }
    // Talk about someone in the third person is to someone else.
    if tokens.contains(where: { ["she", "her", "he", "him", "they"].contains($0) }) { return false }
    let toYou = tokens.contains { ["you", "you're", "your", "you've", "you'll"].contains($0) }
    let asks = lower.contains("?") || ["how", "what", "is", "does", "do", "can", "should", "where", "when", "which", "why", "tell", "show"]
      .contains(tokens.first ?? "")
    // A cut-off "can you" is not a question yet.
    if asks && (lower.contains("?") || tokens.count >= 3) && (toYou || tokens.count >= 3) { return true }
    return sinceCoachSpoke <= followUp && tokens.count >= 3
  }
}
