import Foundation

/// What the cook meant. Navigation and timers are handled on the phone; the rest goes to the coach.
public enum Intent: Equatable, Sendable {
  case next, previous, repeatStep, done, back
  case setTimer(seconds: Int)
  case question(String)
  /// Filler on its own ("OK", "um"): nothing to answer.
  case ignore
}

private let units = ["one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
                     "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
                     "seventeen": 17, "eighteen": 18, "nineteen": 19, "a": 1, "an": 1]
private let tens = ["twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "ninety": 90]

/// The first number in `words` (digits, "twenty five", "an"), and where it ended.
private func number(in words: [String]) -> (value: Int, end: Int)? {
  for (i, w) in words.enumerated() {
    if let n = Int(w) { return (n, i + 1) }
    if let t = tens[w] {
      if i + 1 < words.count, let u = units[words[i + 1]], u < 10 { return (t + u, i + 2) }
      return (t, i + 1)
    }
    if let u = units[w] { return (u, i + 1) }
  }
  return nil
}

private func timer(_ words: [String]) -> Int? {
  // Read the number after "timer": "set a timer for twenty minutes" must not take the first "a" as one.
  guard let at = words.firstIndex(of: "timer") else { return nil }
  // "…timer for twenty minutes", else "…a twenty minute timer" (articles dropped so "a" isn't read as one).
  let after = Array(words[(at + 1)...])
  let before = words[..<at].filter { $0 != "a" && $0 != "an" }
  let (rest, found): ([String], (value: Int, end: Int)?) = number(in: after).map { (after, $0) } ?? (Array(before), number(in: Array(before)))
  guard let (n, end) = found, end < rest.count else { return nil }
  switch rest[end] {
  case let u where u.hasPrefix("second"): return n
  case let u where u.hasPrefix("minute"): return n * 60
  case let u where u.hasPrefix("hour"): return n * 3600
  default: return nil
  }
}

/// Reads a finished utterance. Only short, whole commands navigate — "is the next bit hard?" stays a question.
public func parseIntent(_ utterance: String) -> Intent {
  let cleaned = utterance.lowercased()
    .replacingOccurrences(of: "’", with: "'")
    .replacingOccurrences(of: "-", with: " ")
    .components(separatedBy: CharacterSet.letters.union(.decimalDigits).union(CharacterSet(charactersIn: "' ")).inverted)
    .joined()
  let words = cleaned.split(separator: " ").map(String.init).filter { !["ok", "okay", "so", "um", "please"].contains($0) }
  let phrase = words.joined(separator: " ")
  if words.isEmpty { return .ignore }

  if let seconds = timer(words) { return .setTimer(seconds: seconds) }
  if ["i'm back", "im back", "i am back", "back now", "i'm back now"].contains(phrase) { return .back }
  if ["go back", "previous step", "go back a step", "last step", "back a step"].contains(phrase) { return .previous }
  if ["what's next", "whats next", "next step", "next", "what now", "what next"].contains(phrase) { return .next }
  if ["say that again", "repeat that", "repeat", "what was that", "again"].contains(phrase) { return .repeatStep }
  if ["done", "i'm done", "im done", "i am done", "that's done", "thats done", "finished", "all done"].contains(phrase)
    || (words.first == "finished" && words.count <= 3) {
    return .done
  }
  return .question(utterance)
}
