import Foundation

/// What Muse Voice Transcribe says back over the Worker's `/v1/listen` socket (the Worker passes it untouched).
public enum MuseEvent: Equatable, Sendable {
  case ready                 // the config was accepted (its first reply carries a sessionId)
  case hearing(String)       // speech under way: a partial transcript, possibly empty at speech start
  case finished(String)      // the end of an utterance, with its final words (`speechComplete`)
  case failed(String)
  case other

  public static func decode(_ text: String) -> MuseEvent {
    guard let o = try? JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any] else { return .other }
    let type = o["type"] as? String
    let words = (o["transcript"] as? String) ?? (o["text"] as? String)
    switch type {
    case "speechComplete": return .finished(words ?? "")
    case "error": return .failed((o["message"] as? String) ?? "error")
    case "speechStart": return .hearing("")
    case .some(let t) where t != "speechEnd" && words != nil: return .hearing(words!)   // partials, whatever they're called
    case nil where o["sessionId"] != nil: return .ready
    default: return .other
    }
  }
}

/// Collects 16-bit PCM into the 100 ms frames Muse was measured with (4,800 bytes at 24 kHz mono).
public struct PCMChunker: Sendable {
  public static let frameBytes = 4_800
  private var pending = Data()
  public init() {}

  public mutating func add(_ bytes: Data) -> [Data] {
    pending.append(bytes)
    var out: [Data] = []
    while pending.count >= Self.frameBytes {
      out.append(pending.prefix(Self.frameBytes))
      pending.removeFirst(Self.frameBytes)
    }
    return out
  }
}

/// Muse transcribes the coach's own voice when it comes back through the microphone (recording 00-30-58: "Looks like
/// you've stepped away…" came back as speech), so while the coach talks — and for `echo` after — the microphone is
/// replaced by silence of the same length. Silence, not nothing: Muse's clock keeps running, so a cook's sentence the
/// coach cut into is still closed off on time instead of being glued to whatever is said next.
public struct EchoGate: Sendable {
  public var echo: TimeInterval = 0.3
  public init() {}
  public func open(coachTalking: Bool, coachStoppedAt: Date, now: Date) -> Bool {
    !coachTalking && now.timeIntervalSince(coachStoppedAt) >= echo - 0.001
  }
}
