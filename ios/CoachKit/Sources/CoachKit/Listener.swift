#if os(iOS)
@preconcurrency import AVFoundation
import Speech

/// Hands-free listening: the glasses' (or phone's) microphone → on-device speech recognition → finished
/// utterances, via the Endpointer. The coach's own voice is ignored, and the transcript starts afresh each time the
/// coach falls quiet or an utterance is taken, so its words never linger in what the cook "said".
@MainActor
public final class Listener {
  public let utterances: AsyncStream<String>
  private let emit: AsyncStream<String>.Continuation
  private let speaker: Speaker
  private let engine = AVAudioEngine()
  private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var endpointer = Endpointer()
  private var ticker: Timer?

  public init(speaker: Speaker) {
    self.speaker = speaker
    (utterances, emit) = AsyncStream.makeStream(of: String.self)
  }

  public enum Failure: Error { case noSpeechPermission, noMicPermission, noRecognizer }

  public func start() async throws {
    let speech = await withCheckedContinuation { c in SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0) } }
    guard speech == .authorized else { throw Failure.noSpeechPermission }
    guard await AVAudioApplication.requestRecordPermission() else { throw Failure.noMicPermission }
    guard recognizer?.isAvailable == true else { throw Failure.noRecognizer }

    // Glasses: the mic arrives over Bluetooth HFP. Meta advises letting the route settle (~2 s) before streaming.
    let audio = AVAudioSession.sharedInstance()
    try audio.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetoothHFP, .defaultToSpeaker])
    try audio.setActive(true)

    let input = engine.inputNode
    input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { [weak self] buffer, _ in
      self?.request?.append(buffer)
    }
    engine.prepare()
    try engine.start()

    speaker.onQuiet = { [weak self] in
      guard let self else { return }
      self.endpointer.coachStopped(at: Date())
      self.restart()
    }
    restart()
    ticker = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
      Task { @MainActor in self?.tick() }
    }
  }

  public func stop() {
    ticker?.invalidate()
    task?.cancel(); request?.endAudio()
    engine.inputNode.removeTap(onBus: 0); engine.stop()
    emit.finish()
  }

  /// A fresh recognition task: after each utterance, after the coach speaks, and when Apple's ~1-minute task ends.
  private func restart() {
    task?.cancel(); request?.endAudio()
    let r = SFSpeechAudioBufferRecognitionRequest()
    r.shouldReportPartialResults = true
    if recognizer?.supportsOnDeviceRecognition == true { r.requiresOnDeviceRecognition = true }
    request = r
    task = recognizer?.recognitionTask(with: r) { [weak self] result, error in
      let text = result?.bestTranscription.formattedString
      let ended = error != nil || result?.isFinal == true
      Task { @MainActor in
        guard let self, self.request === r else { return }
        if let text { self.endpointer.heard(text, at: Date(), coachTalking: self.speaker.isSpeaking) }
        if ended { self.restart() }
      }
    }
  }

  private func tick() {
    if let said = endpointer.tick(at: Date()) {
      emit.yield(said)
      restart()
    }
  }
}
#endif
