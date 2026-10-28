import Foundation
import Observation

/// One cook, step by step. Navigation and timers are answered on the phone at once; "done", "I'm back" and
/// questions go to the coach with fresh frames, and whatever comes back is spoken in order.
@MainActor @Observable
public final class CoachSession {
  public enum Phase: Equatable { case cooking, waiting, finished }
  /// Which frames a turn needs: "done" reviews the whole step; a question or "I'm back" looks at what's there now.
  public enum FrameNeed: Equatable { case acrossStep(since: Date), recent }

  public let recipe: CoachRecipe
  public let sessionId: String
  public let steps: [LinkedStep]
  public private(set) var stepIndex = 0
  public private(set) var phase: Phase = .cooking

  private let send: (TurnRequest) -> AsyncThrowingStream<CoachEvent, Error>
  private let say: (String) -> Void
  private let frames: (FrameNeed) -> [String]
  private let seen: () -> [String]
  private let now: () -> Date
  /// When the current step began, so "done" can look back across all of it.
  public private(set) var stepStartedAt: Date
  /// The conversation so far — the cook's words and the coach's — sent with each turn so the coach builds on it.
  public private(set) var history: [HistoryLine] = []
  static let historyLimit = 12
  /// What the coach says while it looks, when an answer is slow. Never the same twice in a row; the Worker's own
  /// ack text is ignored (it repeated within a step and every answer, his second tuna cook).
  public static let acks = [
    "Let me see that.", "One sec.", "Hmm, let's have a look.", "Okay, looking.", "Let me check.",
    "Give me a second.", "Let's see.", "Okay, one moment.", "Let me look.", "Right, let's see.",
    "Hang on, looking.", "Just a sec.",
  ]
  /// Answers take 1.5–3 s: an ack is only spoken if nothing has started by then…
  static let ackDelay = 1.3
  /// …and not again within this long of the last one.
  static let ackCooldown = 15.0
  private var pendingAck: UUID?
  private var lastAckAt: Date?
  private var lastAck = -1
  private let schedule: (Double, @escaping @MainActor () -> Void) -> Void

  /// - Parameters:
  ///   - send: one turn to the Worker, as its events arrive — the ack is spoken before the answer exists.
  ///   - say: speak a line.
  ///   - frames: the frames to show the coach, as base64 JPEG, for what the turn needs.
  ///   - seen: the observer's log, newest last ("0:51 shook salt over the bowl"), sent with every turn.
  ///   - schedule: run a closure after a number of seconds (a timer).
  public init(
    recipe: CoachRecipe, sessionId: String, steps: [LinkedStep],
    send: @escaping (TurnRequest) -> AsyncThrowingStream<CoachEvent, Error>, say: @escaping (String) -> Void,
    frames: @escaping (FrameNeed) -> [String], seen: @escaping () -> [String] = { [] },
    schedule: @escaping (Double, @escaping @MainActor () -> Void) -> Void,
    now: @escaping () -> Date = Date.init
  ) {
    self.recipe = recipe; self.sessionId = sessionId; self.steps = steps
    self.send = send; self.say = say; self.frames = frames; self.seen = seen; self.schedule = schedule
    self.now = now; self.stepStartedAt = now()
  }

  /// Something the coach said outside a turn (the observer speaking up, holding the place), so turns build on it.
  public func noteCoach(_ line: String) { remember(.coach, line) }

  private func remember(_ who: HistoryLine.Who, _ text: String) {
    guard !text.isEmpty else { return }
    history.append(HistoryLine(who: who, text: text))
    if history.count > Self.historyLimit { history.removeFirst(history.count - Self.historyLimit) }
  }

  private func advance() {
    // Once finished, say nothing more about steps: the ending was said three times on his second cook.
    if phase == .finished { return }
    if stepIndex + 1 >= steps.count { phase = .finished; say("That was the last step. Enjoy it."); return }
    stepIndex += 1; stepStartedAt = now(); speakStep()
  }

  private func speakStep() {
    guard steps.indices.contains(stepIndex) else { return }
    say("Step \(stepIndex + 1): \(steps[stepIndex].text)")
  }

  public func handle(_ intent: Intent) async {
    switch intent {
    case .next:
      advance()
    case .previous:
      stepIndex = max(0, stepIndex - 1); stepStartedAt = now(); speakStep()
    case .repeatStep:
      speakStep()
    case .done:
      await ask("I've finished this step. Did I miss anything before I move on?", .acrossStep(since: stepStartedAt))
    case .back:
      await ask("I'm back. How is it looking?", .recent)
    case .question(let words):
      await ask(words, .recent)
    case .ignore:
      return
    case .setTimer(let seconds):
      phase = .waiting
      let label = Self.describe(seconds)
      say("Timer set for \(label).")
      schedule(Double(seconds)) { [weak self] in
        guard let self else { return }
        self.phase = .cooking
        self.say("Your \(Self.describe(seconds, adjective: true)) timer is up — let's check.")
      }
    }
  }

  private func ask(_ utterance: String, _ need: FrameNeed) async {
    var turn = TurnRequest(sessionId: sessionId, stepIndex: stepIndex, utterance: utterance, frames: frames(need), seen: seen())
    turn.history = history
    remember(.cook, utterance)
    var spoken: [String] = []
    var decision = Decision.stay
    // Text arrives in fragments; it is spoken a whole sentence at a time, and whatever is left when the turn ends.
    var pending = ""
    func speak(_ line: String) { spoken.append(line); say(line) }
    func flush() {
      let rest = pending.trimmingCharacters(in: .whitespacesAndNewlines)
      if !rest.isEmpty { speak(rest) }
      pending = ""
    }
    /// The ack is held back and only spoken if nothing else has started within `ackDelay`.
    func cancelAck() { pendingAck = nil }
    do {
      for try await event in send(turn) {
        switch event {
        case .ack:
          if let last = lastAckAt, now().timeIntervalSince(last) < Self.ackCooldown { break }
          let token = UUID()
          pendingAck = token
          schedule(Self.ackDelay) { [weak self] in
            guard let self, self.pendingAck == token else { return }
            self.pendingAck = nil
            // Step past the last one by a stride that varies with the step, so the order isn't a loop.
            let n = Self.acks.count
            self.lastAck = (self.lastAck + 1 + (self.stepIndex * 5) % (n - 1)) % n
            self.lastAckAt = self.now()
            self.say(Self.acks[self.lastAck])
          }
        case .text(let piece):
          cancelAck()
          pending += piece
          completeSentences(&pending).forEach(speak)
        case .action(let d): decision = d
        case .error(let line): cancelAck(); flush(); say(line)
        case .done: flush()
        }
      }
      flush()
    } catch {
      cancelAck()
      flush()
      // The connection itself failed (no signal, server down): still never silence.
      say(Self.lostLine)
    }
    remember(.coach, spoken.joined(separator: " "))
    if decision == .next { advance() }
  }

  static let lostLine = "Sorry, I lost that — ask me again."

  /// "20 minutes" / "20-minute"; "90 seconds"; "1 hour".
  static func describe(_ seconds: Int, adjective: Bool = false) -> String {
    let (n, unit): (Int, String) = seconds % 3600 == 0 ? (seconds / 3600, "hour")
      : seconds % 60 == 0 ? (seconds / 60, "minute") : (seconds, "second")
    return adjective ? "\(n)-\(unit)" : "\(n) \(unit)\(n == 1 ? "" : "s")"
  }
}
