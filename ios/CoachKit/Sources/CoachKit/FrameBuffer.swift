import Foundation

/// The last stretch of camera frames, kept on the phone. "Done" reviews frames spread across the whole step —
/// one snapshot of a bowl can't show whether the oregano went in; a run of frames across the step can.
public struct FrameBuffer: Sendable {
  private var frames: [(at: Date, jpeg: Data)] = []
  public let capacity: Int

  public init(capacity: Int) { self.capacity = capacity }

  public mutating func push(_ jpeg: Data, at date: Date) {
    frames.append((date, jpeg))
    if frames.count > capacity { frames.removeFirst(frames.count - capacity) }
  }

  /// The newest `n`, oldest first.
  public func last(_ n: Int) -> [Data] { frames.suffix(n).map(\.jpeg) }

  /// Up to `max` frames spread evenly over everything since `date`, always including the first and the newest.
  public func sampled(since date: Date, max: Int) -> [Data] {
    let span = frames.filter { $0.at >= date }.map(\.jpeg)
    if max <= 0 { return [] }
    if span.count <= max { return span }
    if max == 1 { return [span[span.count - 1]] }
    return (0..<max).map { span[Int((Double($0) * Double(span.count - 1) / Double(max - 1)).rounded())] }
  }
}

/// Where the coach's eyes are — glasses or the phone — behind one slot.
public enum DeviceStatus: Equatable, Sendable {
  case starting, ready
  /// Folded, taken off, or another app took the camera; the reason is said to the cook.
  case paused(String)
  case disconnected(String)
}

@MainActor
public protocol CoachDevice: AnyObject {
  var status: DeviceStatus { get }
  func start() async throws
  func stop()
  /// The newest frames, oldest first.
  func recent(_ n: Int) -> [Data]
  /// Frames spread across everything since `date` (the start of the step).
  func across(since date: Date, max: Int) -> [Data]
}
