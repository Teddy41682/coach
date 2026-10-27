import Foundation

/// What happened in a session, in order, timed from its start — the script a story gets cut from.
public struct RecordingLog: Sendable {
  public enum Event: Sendable {
    case heard(String)          // what the cook said (a finished utterance)
    case said(String)           // what the coach said
    case step(Int, String)      // a step began (1-based)
    case note(String)           // device and other happenings
  }

  public let start: Date
  private var lines: [String] = []

  public init(start: Date) { self.start = start }

  /// Adds the event and returns its JSON line, so a recorder can append it to disk as it happens.
  @discardableResult
  public mutating func add(_ e: Event, at date: Date) -> String {
    var o: [String: Any] = ["t": (date.timeIntervalSince(start) * 1000).rounded() / 1000]
    switch e {
    case .heard(let s): o["kind"] = "heard"; o["text"] = s
    case .said(let s): o["kind"] = "said"; o["text"] = s
    case .step(let n, let s): o["kind"] = "step"; o["step"] = n; o["text"] = s
    case .note(let s): o["kind"] = "note"; o["text"] = s
    }
    let data = (try? JSONSerialization.data(withJSONObject: o, options: [.sortedKeys])) ?? Data()
    let line = String(decoding: data, as: UTF8.self)
    lines.append(line)
    return line
  }

  public func jsonLines() -> String { lines.joined(separator: "\n") + (lines.isEmpty ? "" : "\n") }

  /// "000001500.jpg" for 1.5 s — milliseconds, zero-padded so names sort in time order.
  public static func frameName(at seconds: TimeInterval) -> String {
    String(format: "%09lld.jpg", Int64((seconds * 1000).rounded()))
  }
}

/// Keeps one moment in every `every` seconds: the coach's 2-a-second view of a 15-a-second recording stream.
public struct Thinner: Sendable {
  public let every: TimeInterval
  private var last: Date?
  public init(every: TimeInterval) { self.every = every }
  public mutating func keep(at date: Date) -> Bool {
    if let last, date.timeIntervalSince(last) < every - 0.001 { return false }
    last = date
    return true
  }
}
