import CoreGraphics
import Foundation
import ImageIO

/// What woke the mind: the picture changed, the cook finished speaking, a timer ended, or a quiet heartbeat.
public enum WakeReason: String, Sendable, Codable { case changed, spoke, timer, heartbeat }

/// A frame as the eyes see it: a tiny greyscale thumbnail, cheap enough to make twice a second.
public struct Thumb: Sendable, Equatable {
  public let pixels: [UInt8]
  public init(pixels: [UInt8]) { self.pixels = pixels }

  /// `Eyes.side`² box-averaged grey pixels of a JPEG (the replay's `thumb`, tools/replay.py); nil if it isn't an image.
  public static func of(jpeg: Data) -> Thumb? {
    let side = Eyes.side
    guard let src = CGImageSourceCreateWithData(jpeg as CFData, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(src, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: side * 8,
          ] as CFDictionary)
    else { return nil }
    let w = image.width, h = image.height
    guard w >= side, h >= side,
          let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                              space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)
    else { return nil }
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
    guard let data = ctx.data else { return nil }
    let grey = data.bindMemory(to: UInt8.self, capacity: w * h)
    var out = [UInt8](repeating: 0, count: side * side)
    for by in 0..<side {
      for bx in 0..<side {
        let x0 = bx * w / side, x1 = (bx + 1) * w / side, y0 = by * h / side, y1 = (by + 1) * h / side
        var sum = 0
        for y in y0..<y1 { for x in x0..<x1 { sum += Int(grey[y * w + x]) } }
        out[by * side + bx] = UInt8(sum / max(1, (x1 - x0) * (y1 - y0)))
      }
    }
    return Thumb(pixels: out)
  }

  /// Mean absolute difference after removing each picture's mean (exposure swings don't count), 0–1.
  public func diff(_ other: Thumb) -> Double {
    guard pixels.count == other.pixels.count, !pixels.isEmpty else { return 1 }
    let n = Double(pixels.count)
    let ma = pixels.reduce(0.0) { $0 + Double($1) } / n, mb = other.pixels.reduce(0.0) { $0 + Double($1) } / n
    var sum = 0.0
    for i in pixels.indices { sum += abs((Double(pixels[i]) - ma) - (Double(other.pixels[i]) - mb)) }
    return sum / n / 255
  }
}

/// The coach's eyes: cheap, always on, on the phone. They describe nothing and decide nothing — they only say
/// *wake the mind now*: the picture has changed since the mind last looked and has settled (the cook is looking at
/// something new), or nothing has woken it for a while (the heartbeat). The thresholds are perception tuning, set on
/// his recordings with tools/replay.py — keep them equal to the replay's.
public struct Eyes: Sendable {
  public static let side = 8
  /// This different from the mind's last look…
  public static let change = 0.10
  /// …and no more than this different from a second ago.
  public static let steady = 0.06
  public static let spacing = 2.5
  public static let heartbeat = 30.0

  private var reference: Thumb?
  private var history: [(at: Date, thumb: Thumb)] = []
  private var lastEye: Date = .distantPast
  private var lastCall: Date?

  public init() {}

  /// One frame (call twice a second). `busy`: a mind call is in flight — nothing wakes it.
  public mutating func look(_ thumb: Thumb, at now: Date, busy: Bool) -> WakeReason? {
    history = history.filter { now.timeIntervalSince($0.at) <= 3 } + [(now, thumb)]
    if busy { return nil }
    guard let reference else { return .changed }
    if let lastCall, now.timeIntervalSince(lastCall) >= Self.heartbeat { return .heartbeat }
    if now.timeIntervalSince(lastEye) < Self.spacing - 1e-6 { return nil }
    guard let before = history.last(where: { $0.at <= now.addingTimeInterval(-1 + 1e-6) }) else { return nil }
    let steady = thumb.diff(before.thumb) <= Self.steady
    return steady && thumb.diff(reference) >= Self.change ? .changed : nil
  }

  /// The mind was called, shown `showing`. A spoken wake (`eye: false`) restarts the heartbeat, not the spacing.
  public mutating func woke(at now: Date, showing: Thumb?, eye: Bool = true) {
    if let showing { reference = showing }
    lastCall = now
    if eye { lastEye = now }
  }
}

/// Everything that happened this cook — what the mind saw, what was said and by whom — timed from the start. The
/// newest 50 lines travel with every wake; the whole of it stays for the recording.
public struct Timeline: Sendable {
  public enum Kind: String, Sendable { case saw, cook, coach, note }
  public struct Entry: Sendable, Equatable { public let seconds: Double; public let kind: Kind; public let text: String }
  public private(set) var entries: [Entry] = []
  private let start: Date
  /// The Worker takes timeline lines of at most this many characters.
  static let lineMax = 200

  public init(start: Date) { self.start = start }

  /// The same sight again within 10 s is the same moment, not a new one.
  public mutating func add(_ kind: Kind, _ text: String, at date: Date) {
    let s = date.timeIntervalSince(start)
    let line = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !line.isEmpty else { return }
    if kind == .saw, entries.contains(where: { $0.kind == .saw && $0.text == line && s - $0.seconds < 10 }) { return }
    entries.append(Entry(seconds: s, kind: kind, text: line))
  }

  /// The newest `limit` lines as "1:05 cook: is it done?".
  public func lines(_ limit: Int = 50) -> [String] {
    entries.suffix(limit).map { e in
      let t = Int(max(0, e.seconds).rounded(.down))
      // Clipped by UTF-16 units — the Worker's count — not by Characters: an emoji near the end would otherwise
      // push the line over 200 and the Worker would refuse every wake (review, 2026-10-28).
      var line = "\(t / 60):\(String(format: "%02d", t % 60)) \(e.kind.rawValue): \(e.text)"
      while line.utf16.count > Self.lineMax { line.removeLast() }
      return line
    }
  }
}
