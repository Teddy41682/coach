import AVFoundation

/// The coach's voice: queues lines on the system synthesiser (Meta has no text-to-speech) and knows when it is
/// talking, so the listener can ignore the coach's own voice coming back through the mic.
@MainActor
public final class Speaker: NSObject, AVSpeechSynthesizerDelegate {
  private let synth = AVSpeechSynthesizer()
  private let voice: AVSpeechSynthesisVoice?
  public private(set) var isSpeaking = false
  /// When the last line finished; the listener stays deaf for a moment after it.
  public private(set) var lastFinished: Date = .distantPast
  /// Called when the coach falls quiet, so the listener can start a clean transcript.
  public var onQuiet: (() -> Void)?

  /// The best installed English voice: premium or enhanced if the phone has one. Shared with the recorder.
  public static let chosenVoice: AVSpeechSynthesisVoice? = {
    let english = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("en-") }
    return english.max { $0.quality.rawValue < $1.quality.rawValue } ?? AVSpeechSynthesisVoice(language: "en-US")
  }()

  public override init() {
    voice = Self.chosenVoice
    super.init()
    synth.delegate = self
  }

  /// The system's default rate sounded rushed on his fourth PB&J (2026-10-30, "talking so fast"): a little slower,
  /// with a breath after each sentence. The recorder renders with the same settings, so the video matches what he heard.
  public static func utterance(_ line: String) -> AVSpeechUtterance {
    let u = AVSpeechUtterance(string: line)
    u.voice = chosenVoice
    u.rate = AVSpeechUtteranceDefaultSpeechRate * 0.88
    u.postUtteranceDelay = 0.35
    return u
  }

  public func say(_ line: String) {
    let u = Self.utterance(line)
    isSpeaking = true
    synth.speak(u)
  }

  public func stop() { synth.stopSpeaking(at: .immediate) }

  nonisolated public func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) {
    Task { @MainActor in
      if !self.synth.isSpeaking { self.isSpeaking = false; self.lastFinished = Date(); self.onQuiet?() }
    }
  }

  nonisolated public func speechSynthesizer(_ s: AVSpeechSynthesizer, didCancel u: AVSpeechUtterance) {
    Task { @MainActor in self.isSpeaking = false; self.lastFinished = Date(); self.onQuiet?() }
  }
}
