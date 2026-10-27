#if os(iOS)
import Foundation
import Observation

/// Wires one cook together: the eyes (glasses or phone), the voice, the listener, the Worker and the session.
/// J'habite's "Cook with your glasses?" and the demo app both drive this.
@MainActor @Observable
public final class CoachRunner {
  public enum Activity: Equatable { case starting, listening, thinking, speaking, stopped(String) }

  public private(set) var activity: Activity = .starting
  public private(set) var lastHeard = ""
  public private(set) var stepText = ""
  public private(set) var stepNumber = 0
  public private(set) var deviceNote = ""
  /// Seconds from the end of the cook's words to the coach's first spoken line, for the latest turn.
  public private(set) var lastResponse: TimeInterval?

  private let recipe: CoachRecipe
  private let device: CoachDevice
  private let client: CoachClient
  private let speaker = Speaker()
  private var listener: Listener?
  private var session: CoachSession?
  private var heardAt: Date?
  private var watcher: Task<Void, Never>?
  private var lastLoggedStep = 0
  /// Set when this session is being recorded.
  public let recorder: SessionRecorder?

  public init(recipe: CoachRecipe, device: CoachDevice, client: CoachClient, recorder: SessionRecorder? = nil) {
    self.recipe = recipe; self.device = device; self.client = client; self.recorder = recorder
  }

  private func say(_ line: String) {
    if let t = heardAt { lastResponse = Date().timeIntervalSince(t); heardAt = nil }
    activity = .speaking
    recorder?.note(.said(line))
    speaker.say(line)
  }

  public func start() async {
    do {
      if let recorder { device.onFrame = { recorder.frame($0, at: $1) }; recorder.note(.note("start: \(recipe.title)")) }
      try await device.start()
      let (sessionId, steps) = try await client.start(recipe)
      let session = CoachSession(
        recipe: recipe, sessionId: sessionId, steps: steps,
        send: { [client] in client.turn($0) },
        say: { [weak self] in self?.say($0) },
        frames: { [device] need in
          let jpegs: [Data]
          switch need {
          case .acrossStep(let since): jpegs = device.across(since: since, max: 6)
          case .recent: jpegs = device.recent(2)
          }
          return jpegs.map { $0.base64EncodedString() }
        },
        schedule: { secs, fire in Task { @MainActor in try? await Task.sleep(for: .seconds(secs)); fire() } })
      self.session = session
      let listener = Listener(speaker: speaker)
      self.listener = listener
      listener.record(into: recorder?.mic)
      try await listener.start()
      say("Let's make \(recipe.title). Step 1: \(steps.first?.text ?? "")")
      refresh()
      watchDevice()
      for await words in listener.utterances {
        lastHeard = words
        recorder?.note(.heard(words))
        heardAt = Date()
        activity = .thinking
        await session.handle(parseIntent(words))
        refresh()
        if !speaker.isSpeaking { activity = .listening }
      }
    } catch {
      activity = .stopped("Couldn't start: \(error.localizedDescription)")
      recorder?.note(.note("failed: \(error.localizedDescription)"))
    }
  }

  public func stop() {
    watcher?.cancel()
    listener?.stop()
    speaker.stop()
    device.stop()
    recorder?.note(.note("stop"))
    recorder?.finish()
    activity = .stopped("Stopped.")
  }

  private func refresh() {
    guard let s = session else { return }
    stepNumber = s.stepIndex + 1
    stepText = s.steps.indices.contains(s.stepIndex) ? s.steps[s.stepIndex].text : ""
    if stepNumber != lastLoggedStep { recorder?.note(.step(stepNumber, stepText)); lastLoggedStep = stepNumber }
  }

  /// Says it out loud when the glasses fold, pause or drop, and when they're back.
  private func watchDevice() {
    watcher = Task { [weak self] in
      var last: DeviceStatus = .ready
      while !Task.isCancelled {
        try? await Task.sleep(for: .seconds(1))
        guard let self else { return }
        let now = self.device.status
        if now != last {
          switch now {
          case .paused(let why), .disconnected(let why):
            self.deviceNote = why; self.recorder?.note(.note("device: \(why)")); self.say(why)
          case .ready: if last != .starting { self.deviceNote = ""; self.say("I can see again.") }
          case .starting: break
          }
          last = now
        }
        if !self.speaker.isSpeaking, self.activity == .speaking { self.activity = .listening }
      }
    }
  }
}
#endif
