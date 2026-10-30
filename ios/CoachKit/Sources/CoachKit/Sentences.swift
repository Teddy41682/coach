import Foundation

private let abbreviations: Set<String> = ["e.g", "i.e", "etc", "dr", "vs", "approx", "mr", "mrs", "st"]

/// Pulls the complete sentences off the front of `buffer`, leaving the unfinished rest. A sentence ends at . ! or ?
/// followed by whitespace — so "1.5" and a full stop still waiting for its next chunk are never cut — unless the
/// word before the full stop is an abbreviation ("e.g.").
public func completeSentences(_ buffer: inout String) -> [String] {
  var sentences: [String] = []
  var start = buffer.startIndex
  var i = buffer.startIndex
  while i < buffer.endIndex {
    let c = buffer[i]
    let next = buffer.index(after: i)
    if "!?.".contains(c), next < buffer.endIndex, buffer[next].isWhitespace {
      let candidate = buffer[start...i]
      let lastWord = candidate.split(separator: " ").last.map { $0.dropLast().lowercased() } ?? ""
      if c != "." || !abbreviations.contains(lastWord) {
        sentences.append(candidate.trimmingCharacters(in: .whitespaces))
        start = next
      }
    }
    i = next
  }
  buffer = String(buffer[start...])
  return sentences.filter { !$0.isEmpty }
}

/// The answer's opening clause, taken off the front of `buffer` once a dash, comma or semicolon follows at least four
/// words — so the coach starts speaking before the whole first sentence has streamed in ("That landed on the plate —"
/// while "scrape it onto the slice" is still on its way). Nil until there is such a clause. Used for the first piece only.
public func openingClause(_ buffer: inout String) -> String? {
  for mark in [" — ", ", ", "; "] {
    guard let r = buffer.range(of: mark) else { continue }
    let head = buffer[..<r.lowerBound]
    guard head.split(separator: " ").count >= 4, !head.contains(where: { ".!?".contains($0) }) else { continue }
    let clause = (head.trimmingCharacters(in: .whitespaces)) + (mark == " — " ? " —" : mark.trimmingCharacters(in: .whitespaces))
    buffer = String(buffer[r.upperBound...])
    return clause
  }
  return nil
}
