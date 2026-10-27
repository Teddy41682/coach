import Foundation
import Observation

/// One cook, step by step. Navigation and timers are answered on the phone at once; "done", "I'm back" and
/// questions go to the coach with fresh frames, and whatever comes back is spoken in order.
@MainActor @Observable
public final class CoachSession {
  public enum Phase: Equatable { case cooking, waiting, finished }

  public let recipe: CoachRecipe
  public let sessionId: String
  public let steps: [LinkedStep]
  public private(set) var stepIndex = 0
  public private(set) var phase: Phase = .cooking

  private let send: (TurnRequest) -> AsyncThrowingStream<CoachEvent, Error>
  private let say: (String) -> Void
  private let frames: () -> [String]
  private let schedule: (Double, @escaping @MainActor () -> Void) -> Void

  /// - Parameters:
  ///   - send: one turn to the Worker, as its events arrive — the ack is spoken before the answer exists.
  ///   - say: speak a line.
  ///   - frames: the frames to show the coach right now.
  ///   - schedule: run a closure after a number of seconds (a timer).
  public init(
    recipe: CoachRecipe, sessionId: String, steps: [LinkedStep],
    send: @escaping (TurnRequest) -> AsyncThrowingStream<CoachEvent, Error>, say: @escaping (String) -> Void,
    frames: @escaping () -> [String], schedule: @escaping (Double, @escaping @MainActor () -> Void) -> Void
  ) {
    self.recipe = recipe; self.sessionId = sessionId; self.steps = steps
    self.send = send; self.say = say; self.frames = frames; self.schedule = schedule
  }

  private func speakStep() {
    guard steps.indices.contains(stepIndex) else { return }
    say("Step \(stepIndex + 1): \(steps[stepIndex].text)")
  }

  public func handle(_ intent: Intent) async {
    switch intent {
    case .next:
      if stepIndex + 1 >= steps.count { phase = .finished; say("That was the last step. Enjoy it."); return }
      stepIndex += 1; speakStep()
    case .previous:
      stepIndex = max(0, stepIndex - 1); speakStep()
    case .repeatStep:
      speakStep()
    case .done:
      await ask("I've finished this step. Did I miss anything before I move on?")
    case .back:
      await ask("I'm back. How is it looking?")
    case .question(let words):
      await ask(words)
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

  private func ask(_ utterance: String) async {
    let turn = TurnRequest(sessionId: sessionId, stepIndex: stepIndex, utterance: utterance, frames: frames(), seen: [])
    // Text arrives in fragments; it is spoken a whole sentence at a time, and whatever is left when the turn ends.
    var pending = ""
    func flush() {
      let rest = pending.trimmingCharacters(in: .whitespaces)
      if !rest.isEmpty { say(rest) }
      pending = ""
    }
    do {
      for try await event in send(turn) {
        switch event {
        case .ack(let line): say(line)
        case .text(let piece):
          pending += piece
          completeSentences(&pending).forEach(say)
        case .error(let line): flush(); say(line)
        case .done: flush()
        }
      }
      flush()
    } catch {
      flush()
      // The connection itself failed (no signal, server down): still never silence.
      say(Self.lostLine)
    }
  }

  static let lostLine = "Sorry, I lost that — ask me again."

  /// "20 minutes" / "20-minute"; "90 seconds"; "1 hour".
  static func describe(_ seconds: Int, adjective: Bool = false) -> String {
    let (n, unit): (Int, String) = seconds % 3600 == 0 ? (seconds / 3600, "hour")
      : seconds % 60 == 0 ? (seconds / 60, "minute") : (seconds, "second")
    return adjective ? "\(n)-\(unit)" : "\(n) \(unit)\(n == 1 ? "" : "s")"
  }
}
