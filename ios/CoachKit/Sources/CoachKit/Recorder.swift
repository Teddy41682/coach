#if os(iOS)
@preconcurrency import AVFoundation

/// The microphone's audio file, written from the audio thread.
final class MicFile: @unchecked Sendable {
  private let lock = NSLock()
  private var file: AVAudioFile?
  private let url: URL
  init(url: URL) { self.url = url }
  func write(_ buffer: AVAudioPCMBuffer) {
    lock.withLock {
      if file == nil { file = try? AVAudioFile(forWriting: url, settings: buffer.format.settings) }
      try? file?.write(from: buffer)
    }
  }
  func close() { lock.withLock { file = nil } }
}

/// Saves a session as it happens, in Documents/Recordings/<start>/:
///   frames/<ms>.jpg  — everything the eyes saw (the glasses stream at 15 fps while recording)
///   mic.caf          — the cook's microphone
///   said/<ms>.caf    — each line the coach spoke, rendered clean
///   events.jsonl     — heard / said / step / note, timed from the start
/// The Mac's tools/assemble.py turns the folder into a point-of-view video with both voices and captions.
@MainActor
public final class SessionRecorder {
  public let folder: URL
  private var log: RecordingLog
  private let events: FileHandle?
  private let writes = DispatchQueue(label: "coach.recorder")
  private let renderer = AVSpeechSynthesizer()
  let mic: MicFile
  /// After `finish()`, late arrivals are dropped: writing to the closed events file raised an exception and
  /// killed the app on Stop (his phone, 2026-10-27).
  private var finished = false

  public init(now: Date = Date()) throws {
    let stamp = ISO8601DateFormatter().string(from: now).replacingOccurrences(of: ":", with: "-")
    folder = URL.documentsDirectory.appending(path: "Recordings/\(stamp)", directoryHint: .isDirectory)
    for sub in ["frames", "said"] {
      try FileManager.default.createDirectory(at: folder.appending(path: sub), withIntermediateDirectories: true)
    }
    let eventsURL = folder.appending(path: "events.jsonl")
    FileManager.default.createFile(atPath: eventsURL.path(), contents: nil)
    events = try? FileHandle(forWritingTo: eventsURL)
    log = RecordingLog(start: now)
    mic = MicFile(url: folder.appending(path: "mic.caf"))
  }

  public func note(_ e: RecordingLog.Event, at date: Date = Date()) {
    guard !finished else { return }
    let line = log.add(e, at: date) + "\n"
    events?.write(Data(line.utf8))
    if case .said(let text) = e { render(text, at: date) }
  }

  public func frame(_ jpeg: Data, at date: Date) {
    guard !finished else { return }
    let url = folder.appending(path: "frames/" + RecordingLog.frameName(at: date.timeIntervalSince(log.start)))
    writes.async { try? jpeg.write(to: url) }
  }

  /// The coach's line as its own clean audio file, named by when it was spoken.
  private func render(_ text: String, at date: Date) {
    let url = folder.appending(path: "said/" + RecordingLog.frameName(at: date.timeIntervalSince(log.start))
      .replacingOccurrences(of: ".jpg", with: ".caf"))
    let u = AVSpeechUtterance(string: text)
    u.voice = Speaker.chosenVoice
    Self.render(u, with: renderer, to: SaidFile(url: url))
  }

  // The synthesiser hands buffers back on its own thread: a closure written in this @MainActor class would trap
  // there under Swift 6 (as Listener's did on his phone), so it is built in a nonisolated helper.
  nonisolated private static func render(_ u: AVSpeechUtterance, with synth: AVSpeechSynthesizer, to file: SaidFile) {
    synth.write(u) { buffer in
      if let pcm = buffer as? AVAudioPCMBuffer, pcm.frameLength > 0 { file.write(pcm) }
    }
  }

  public func finish() {
    guard !finished else { return }
    finished = true
    mic.close()
    try? events?.close()
  }
}

private final class SaidFile: @unchecked Sendable {
  private let url: URL
  private var file: AVAudioFile?
  init(url: URL) { self.url = url }
  func write(_ b: AVAudioPCMBuffer) {
    if file == nil { file = try? AVAudioFile(forWriting: url, settings: b.format.settings) }
    try? file?.write(from: b)
  }
}
#endif
