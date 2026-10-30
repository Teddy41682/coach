#if os(iOS)
import AVFoundation
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
  /// What the mind's eye wakes have really cost this cook, and how many there were (names kept from the observer).
  public private(set) var observeCents = 0.0
  public private(set) var looks = 0
  /// True while the cook has stepped away and the place is held.
  public private(set) var away = false

  private let recipe: CoachRecipe
  private let device: CoachDevice
  private let client: CoachClient
  private let speaker = Speaker()
  private var listener: Listener?
  private var session: CoachSession?
  private var heardAt: Date?
  private var watcher: Task<Void, Never>?
  private var mind: Mind?
  private var observing: Task<Void, Never>?
  private var routes: Task<Void, Never>?
  private var lastLoggedStep = 0
  /// From the hello until the recipe starts: the eyes keep quiet, so nothing talks over his answer.
  private var opening = false
  private var heardHello = false

  /// The recipe starts once he has answered and been answered — or after `helloWait` seconds of quiet.
  static let helloWait = 7.0
  private func startAfterHello(first: String) {
    Task { [weak self] in
      var quietSince: Date?
      while let self, !self.stopped {
        try? await Task.sleep(for: .milliseconds(200))
        let busy = self.speaker.isSpeaking || self.turning || (self.listener?.isHearing ?? false)
        if busy { quietSince = nil; continue }
        let since = quietSince ?? Date(); quietSince = since
        let waited = Date().timeIntervalSince(since)
        if (self.heardHello && waited >= 0.6) || waited >= Self.helloWait {
          self.opening = false
          self.say("Right, let's make \(self.recipe.title). First, \(first.prefix(1).lowercased() + first.dropFirst())")
          return
        }
      }
    }
  }

  /// Set when this session is being recorded.
  public let recorder: SessionRecorder?

  public init(recipe: CoachRecipe, device: CoachDevice, client: CoachClient, recorder: SessionRecorder? = nil) {
    self.recipe = recipe; self.device = device; self.client = client; self.recorder = recorder
  }

  private var stopped = false
  /// From the cook's words until the answer has finished streaming: the one mind call in flight (review, 2026-10-28 —
  /// `.thinking` alone ended at the ack, so an eye wake could splice a line into the coach's own answer).
  private var turning = false

  /// Stopped while starting (the screen closed mid-start): put down whatever came up during the await, so the
  /// glasses stream and the microphone don't come up after the screen is gone (J'habite review, 2026-10-28).
  private func abandoned() -> Bool {
    guard stopped else { return false }
    device.stop()
    listener?.stop()
    return true
  }

  private func say(_ line: String) {
    guard !stopped else { return }
    if let t = heardAt { lastResponse = Date().timeIntervalSince(t); heardAt = nil }
    activity = .speaking
    recorder?.note(.said(line))
    mind?.note(.coach, line)
    speaker.say(line)
  }

  /// The newest frame and its thumbnail, for the eyes.
  private func newest() -> (jpeg: Data, thumb: Thumb)? {
    guard let jpeg = device.recent(1).last, let thumb = Thumb.of(jpeg: jpeg) else { return nil }
    return (jpeg, thumb)
  }

  public func start() async {
    do {
      if let recorder { device.onFrame = { recorder.frame($0, at: $1) }; recorder.note(.note("start: \(recipe.title)")); recorder.note(.note("voice: \(Speaker.voiceName)")) }
      if stopped { return }
      try await device.start()
      if abandoned() { return }
      let (sessionId, steps) = try await client.start(recipe)
      if abandoned() { return }
      let mind = Mind(
        sessionId: sessionId, start: Date(),
        call: { [client] in try await client.mind($0) },
        frame: { [weak self] in self?.newest() })
      mind.onWake = { [weak self, weak mind, recorder] reason, answer in
        recorder?.note(.wake(reason, answer))
        guard let self, let mind else { return }
        self.observeCents = mind.cents; self.looks = mind.wakes; self.away = mind.held
      }
      self.mind = mind
      let session = CoachSession(
        recipe: recipe, sessionId: sessionId, steps: steps,
        // The cook's words wake the same mind, streamed: the timeline (their words already in it) and the frames.
        send: { [client, weak mind, weak self] turn in
          var req = MindRequest(sessionId: turn.sessionId, stepIndex: turn.stepIndex, wake: .spoke,
                                timeline: mind?.timeline.lines() ?? [], quietFor: 0)
          req.utterance = turn.utterance; req.frames = turn.frames
          req.finished = self?.session?.phase == .finished
          return client.mindTurn(req)
        },
        say: { [weak self] in self?.say($0) },
        frames: { [device] need in
          let jpegs: [Data]
          switch need {
          case .acrossStep(let since): jpegs = device.across(since: since, max: 6)
          case .recent: jpegs = device.recent(2)
          }
          // Shown as the eye wakes are: ≤ 640 px (billed by pixels; the Worker refuses over 1024).
          return jpegs.compactMap { downscaleJPEG($0)?.base64EncodedString() }
        },
        schedule: { secs, fire in Task { @MainActor in try? await Task.sleep(for: .seconds(secs)); fire() } })
      self.session = session
      session.onHold = { [weak self, weak mind, weak session] in
        guard let mind, let session else { return }
        mind.holdPlace(step: session.stepIndex); self?.away = true
      }
      session.onTimerEnded = { [weak mind] in mind?.wakeNow(.timer) }
      let listener = Listener(speaker: speaker, client: client)
      listener.onNote = { [recorder] in recorder?.note(.note($0)) }
      self.listener = listener
      listener.record(into: recorder?.mic)
      try await listener.start()
      if abandoned() { return }
      watchAudioRoute()
      // A hello, then a real pause for his answer before the recipe starts (his fourth PB&J: the question and the
      // first step came in one breath, with no room to answer). His answer is a spoken turn; the mind chats back.
      opening = true
      say("Hey — how's your day going?")
      startAfterHello(first: steps.first?.text ?? "")
      refresh()
      watchDevice()
      watch(session, mind)
      for await words in listener.utterances {
        lastHeard = words
        if opening { heardHello = true }
        recorder?.note(.heard(words))
        heardAt = Date()
        let intent = parseIntent(words)
        // Speaking means they're here; their words join the timeline the mind is woken with.
        // A bare "okay" is not a turn: it must not throw away what the eyes were about to say. On his sixth PB&J
        // "That landed on the plate" was dropped because he'd said "Okay." a second before, and came 12 s late.
        if intent != .ignore {
          mind.note(.cook, words)
          mind.cookSpoke(at: Date(), showing: newest()?.thumb)
        }
        away = mind.held
        activity = .thinking
        turning = true
        await session.handle(intent)
        turning = false
        if stopped { return }
        refresh()
        if !speaker.isSpeaking { activity = .listening }
      }
    } catch {
      if abandoned() { return }
      activity = .stopped("Couldn't start: \(error.localizedDescription)")
      recorder?.note(.note("failed: \(error.localizedDescription)"))
    }
  }

  public func stop() {
    guard !stopped else { return }
    stopped = true
    watcher?.cancel()
    observing?.cancel()
    routes?.cancel()
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

  /// The eyes, beside the conversation: twice a second the newest frame goes to the mind's eyes, which wake it only
  /// when something happened; whatever it decides passes the guardrails and is said here. A spoken turn in flight
  /// (thinking) is the one call in flight; nothing is woken once the recipe is finished.
  private func watch(_ session: CoachSession, _ mind: Mind) {
    observing = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(for: .milliseconds(500))
        guard !Task.isCancelled, let self, !self.stopped else { return }
        let outcome = await mind.tick {
          Mind.Now(step: session.stepIndex, finished: session.phase == .finished,
                   cookSpeaking: self.listener?.isHearing ?? false, coachSpeaking: self.speaker.isSpeaking,
                   turnActive: self.turning || self.opening)
        }
        self.away = mind.held
        guard let outcome, !self.stopped else { continue }
        if let line = outcome.say { self.say(line); session.noteCoach(line) }
        if outcome.step == .next { session.coachMovedOn(saidSomething: outcome.say != nil); self.refresh() }
      }
    }
  }

  /// Notes where the voice is going (glasses, phone speaker…) at the start and on every change, so a recording
  /// shows why the coach was heard from the phone (his try, 2026-10-27 — the cause wasn't recorded).
  private func watchAudioRoute() {
    recorder?.note(.note("audio: \(Self.route())"))
    routes = Task { [weak self] in
      for await _ in NotificationCenter.default.notifications(named: AVAudioSession.routeChangeNotification) {
        guard let self, !Task.isCancelled else { return }
        self.recorder?.note(.note("audio: \(Self.route())"))
      }
    }
  }

  private static func route() -> String {
    let r = AVAudioSession.sharedInstance().currentRoute
    let out = r.outputs.map { "\($0.portType.rawValue) \"\($0.portName)\"" }.joined(separator: ", ")
    let input = r.inputs.map { "\($0.portType.rawValue) \"\($0.portName)\"" }.joined(separator: ", ")
    return "out \(out.isEmpty ? "none" : out) · in \(input.isEmpty ? "none" : input)"
  }

  /// Says it out loud when the glasses fold, pause or drop, and when they're back.
  private func watchDevice() {
    watcher = Task { [weak self] in
      var last: DeviceStatus = .ready
      while !Task.isCancelled {
        try? await Task.sleep(for: .seconds(1))
        guard !Task.isCancelled, let self else { return }
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
