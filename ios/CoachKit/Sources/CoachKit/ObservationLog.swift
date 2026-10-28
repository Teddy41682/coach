import Foundation

/// Everything the observer has seen this cook, timestamped from the start. The newest lines travel with every turn
/// (`seen`) so "did I add the salt?" is answered from what was watched; the whole log stays for the recording.
public struct ObservationLog: Sendable {
  public struct Entry: Sendable, Equatable { public let seconds: Double; public let step: Int; public let text: String }
  public private(set) var entries: [Entry] = []
  private let start: Date
  /// The Worker takes seen and recent lines of at most this many characters.
  static let lineMax = 100

  public init(start: Date) { self.start = start }

  /// Adds the events of one look; the same words again within 10 s are the same moment, not a new one.
  public mutating func append(_ events: [String], at date: Date, step: Int) {
    let s = date.timeIntervalSince(start)
    for e in events where !entries.contains(where: { $0.text == e && s - $0.seconds < 10 }) {
      entries.append(Entry(seconds: s, step: step, text: e))
    }
  }

  /// The newest `limit` lines as "0:51 shook salt over the bowl".
  public func forTurn(limit: Int = 50) -> [String] { entries.suffix(limit).map(Self.line) }
  /// What the observer is shown, so it reports only what's new.
  public func recent(_ n: Int = 10) -> [String] { forTurn(limit: n) }
  public func onStep(_ step: Int) -> [String] { entries.filter { $0.step == step }.map(\.text) }

  static func line(_ e: Entry) -> String {
    let t = Int(e.seconds.rounded(.down))
    return String("\(t / 60):\(String(format: "%02d", t % 60)) \(e.text)".prefix(lineMax))
  }
}
