#if os(iOS)
@preconcurrency import AVFoundation
import Speech

/// Hands-free listening: the glasses' (or phone's) microphone → finished utterances. Two ears:
/// - Muse Voice Transcribe through the Worker (`CoachClient.listen`), the default since 2026-10-29: measured on his
///   kitchen recordings it fixed the phone's mishears and called the end of speech ~1 s sooner. Muse decides when he
///   has finished; the coach's own voice is replaced by silence on the way out (`EchoGate`).
/// - The phone's on-device recogniser via the Endpointer, when there is no client, or when Muse won't open and a
///   reconnect fails. The transcript starts afresh each time the coach falls quiet or an utterance is taken, so its
///   words never linger in what the cook "said".
/// The recognition request the audio thread appends to. Swapped on the main actor, read on the audio thread.
private final class RequestBox: @unchecked Sendable {
  private let lock = NSLock()
  private var value: SFSpeechAudioBufferRecognitionRequest?
  private var mic: MicFile?
  var recording: MicFile? {
    get { lock.withLock { mic } }
    set { lock.withLock { mic = newValue } }
  }
  var request: SFSpeechAudioBufferRecognitionRequest? {
    get { lock.withLock { value } }
    set { lock.withLock { value = newValue } }
  }
}

/// The Muse socket the audio thread writes to: the tap's buffers converted to 24 kHz 16-bit mono, the coach's voice
/// replaced by silence while the gate is shut, sent in 100 ms frames.
private final class MuseFeed: @unchecked Sendable {
  private let lock = NSLock()
  private var socket: URLSessionWebSocketTask?
  private var converter: AVAudioConverter?
  private var chunker = PCMChunker()
  private var open = true
  private let target = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 24_000, channels: 1, interleaved: true)!

  var gate: Bool {
    get { lock.withLock { open } }
    set { lock.withLock { open = newValue } }
  }

  func attach(_ s: URLSessionWebSocketTask?) { lock.withLock { socket = s; chunker = PCMChunker() } }

  func feed(_ buffer: AVAudioPCMBuffer) {
    lock.withLock {
      guard let socket else { return }
      if converter == nil || converter?.inputFormat != buffer.format { converter = AVAudioConverter(from: buffer.format, to: target) }
      guard let converter,
            let out = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: AVAudioFrameCount(
              Double(buffer.frameLength) * target.sampleRate / buffer.format.sampleRate) + 64)
      else { return }
      var given = false
      var failure: NSError?
      converter.convert(to: out, error: &failure) { _, status in
        if given { status.pointee = .noDataNow; return nil }
        given = true
        status.pointee = .haveData
        return buffer
      }
      guard failure == nil, out.frameLength > 0, let samples = out.int16ChannelData else { return }
      let count = Int(out.frameLength) * 2
      let bytes = open ? Data(bytes: samples[0], count: count) : Data(count: count)
      for frame in chunker.add(bytes) { socket.send(.data(frame)) { _ in } }
    }
  }
}

@MainActor
public final class Listener {
  public let utterances: AsyncStream<String>
  private let emit: AsyncStream<String>.Continuation
  private let speaker: Speaker
  private let engine = AVAudioEngine()
  private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
  private let box = RequestBox()
  private var request: SFSpeechAudioBufferRecognitionRequest? {
    get { box.request }
    set { box.request = newValue }
  }
  private var task: SFSpeechRecognitionTask?
  private var endpointer = Endpointer()
  private var ticker: Timer?
  private let client: CoachClient?
  private let feed = MuseFeed()
  private var socket: URLSessionWebSocketTask?
  private var receiving: Task<Void, Never>?
  private var museHearing = false
  private var stopped = false
  private let gate = EchoGate()
  /// Reconnects allowed in one cook. His first PB&J reconnected ~100 times (Muse refused every connection), and each
  /// socket is charged 9¢ against the day's cap; past this the phone hears.
  static let maxReconnects = 2
  private var reconnects = 0
  /// Which ears are on, and why they changed — for the recording (`CoachRunner` notes it).
  public var onNote: ((String) -> Void)?

  /// True while the cook is mid-sentence.
  public var isHearing: Bool { socket != nil ? museHearing : endpointer.isHearing }

  /// While set, the microphone is also written to the recording.
  func record(into mic: MicFile?) { box.recording = mic }

  /// With a client, Muse hears; without one, the phone does.
  public init(speaker: Speaker, client: CoachClient? = nil) {
    self.speaker = speaker
    self.client = client
    (utterances, emit) = AsyncStream.makeStream(of: String.self)
  }

  public enum Failure: Error { case noSpeechPermission, noMicPermission, noRecognizer }

  public func start() async throws {
    guard await AVAudioApplication.requestRecordPermission() else { throw Failure.noMicPermission }
    if let client, let s = try? await client.listen() {
      use(s)
      onNote?("ears: muse")
    } else {
      try await onDevice(client == nil ? "ears: phone" : "ears: phone (muse would not open)")
    }

    // Glasses: the mic arrives over Bluetooth HFP. Meta advises letting the route settle (~2 s) before streaming.
    let audio = AVAudioSession.sharedInstance()
    try audio.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetoothHFP, .defaultToSpeaker])
    try audio.setActive(true)

    Self.tap(engine.inputNode, into: box, feed: feed)
    engine.prepare()
    try engine.start()

    speaker.onQuiet = { [weak self] in
      guard let self, self.socket == nil else { return }
      self.endpointer.coachStopped(at: Date())
      self.restart()
    }
    if socket == nil { restart() }
    ticker = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
      Task { @MainActor in self?.tick() }
    }
  }

  /// The phone's recogniser: needs speech permission, which Muse doesn't.
  private func onDevice(_ why: String) async throws {
    guard await Self.speechAuthorization() == .authorized else { throw Failure.noSpeechPermission }
    guard recognizer?.isAvailable == true else { throw Failure.noRecognizer }
    onNote?(why)
  }

  private func use(_ s: URLSessionWebSocketTask) {
    socket = s
    feed.attach(s)
    receiving = Task { [weak self] in
      do {
        while !Task.isCancelled {
          let message = try await s.receive()
          guard case .string(let text) = message else { continue }
          self?.heard(MuseEvent.decode(text))
        }
      } catch {
        self?.onNote?("muse closed: \(s.closeCode.rawValue) \(s.closeReason.map { String(decoding: $0, as: UTF8.self) } ?? "") \(error.localizedDescription)")
        await self?.lost()
      }
    }
  }

  private func heard(_ e: MuseEvent) {
    switch e {
    case .hearing: museHearing = true
    case .finished(let words):
      museHearing = false
      let said = words.trimmingCharacters(in: .whitespacesAndNewlines)
      if !said.isEmpty { emit.yield(said) }
    case .failed(let why): onNote?("muse: \(why)")
    case .ready, .other: break
    }
  }

  /// Muse's socket closed mid-cook (its 30-minute life, the network): open another once; failing that, the phone hears.
  private func lost() async {
    guard !stopped else { return }
    feed.attach(nil); socket = nil; museHearing = false
    reconnects += 1
    if reconnects <= Self.maxReconnects, let client, let s = try? await client.listen(), !stopped {
      use(s)
      onNote?("ears: muse reconnected")
      return
    }
    guard !stopped else { return }
    do {
      try await onDevice("ears: phone (muse lost)")
      restart()
    } catch {
      onNote?("ears: none — \(error)")
    }
  }

  public func stop() {
    stopped = true
    receiving?.cancel()
    socket?.cancel(with: .normalClosure, reason: nil)
    feed.attach(nil); socket = nil
    ticker?.invalidate()
    task?.cancel(); request?.endAudio()
    engine.inputNode.removeTap(onBus: 0); engine.stop()
    emit.finish()
  }

  /// A fresh recognition task: after each utterance, after the coach speaks, and when Apple's ~1-minute task ends.
  private func restart() {
    guard socket == nil, !stopped else { return }
    task?.cancel(); request?.endAudio()
    let r = SFSpeechAudioBufferRecognitionRequest()
    r.shouldReportPartialResults = true
    if recognizer?.supportsOnDeviceRecognition == true { r.requiresOnDeviceRecognition = true }
    request = r
    let mine = ObjectIdentifier(r)   // which task this callback belongs to; stale tasks' callbacks are dropped
    task = recognizer?.recognitionTask(with: r) { @Sendable [weak self] result, error in
      let text = result?.bestTranscription.formattedString
      let ended = error != nil || result?.isFinal == true
      Task { @MainActor in
        guard let self, let current = self.request, ObjectIdentifier(current) == mine else { return }
        if let text { self.endpointer.heard(text, at: Date(), coachTalking: self.speaker.isSpeaking) }
        if ended { self.restart() }
      }
    }
  }

  // Apple calls these back on its own threads. Closures written inside this @MainActor class would be inferred
  // main-actor-isolated and Swift 6 traps when they run elsewhere (it crashed on his phone at the permission
  // reply), so they are built in nonisolated helpers or marked @Sendable.
  nonisolated private static func speechAuthorization() async -> SFSpeechRecognizerAuthorizationStatus {
    await withCheckedContinuation { c in SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0) } }
  }

  nonisolated private static func tap(_ input: AVAudioInputNode, into box: RequestBox, feed: MuseFeed) {
    input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buffer, _ in
      box.request?.append(buffer)
      box.recording?.write(buffer)
      feed.feed(buffer)
    }
  }

  private func tick() {
    feed.gate = gate.open(coachTalking: speaker.isSpeaking, coachStoppedAt: speaker.lastFinished, now: Date())
    guard socket == nil else { return }
    if let said = endpointer.tick(at: Date()) {
      emit.yield(said)
      restart()
    }
  }
}
#endif
