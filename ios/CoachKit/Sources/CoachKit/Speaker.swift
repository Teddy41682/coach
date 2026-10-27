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

  public override init() {
    // The best installed English voice: premium or enhanced if the phone has one.
    let english = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("en-") }
    voice = english.max { $0.quality.rawValue < $1.quality.rawValue } ?? AVSpeechSynthesisVoice(language: "en-US")
    super.init()
    synth.delegate = self
  }

  public func say(_ line: String) {
    let u = AVSpeechUtterance(string: line)
    u.voice = voice
    u.rate = AVSpeechUtteranceDefaultSpeechRate
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
