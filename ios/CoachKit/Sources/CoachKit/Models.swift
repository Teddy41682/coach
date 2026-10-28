import Foundation

/// A recipe as the coach needs it — the same shape the Worker's `/v1/session` takes.
public struct CoachRecipe: Codable, Sendable, Equatable {
  public struct Ingredient: Codable, Sendable, Equatable {
    public let amount: String
    public let item: String
    public init(amount: String, item: String) { self.amount = amount; self.item = item }
  }
  public let title: String
  public let ingredients: [Ingredient]
  public let steps: [String]
  public init(title: String, ingredients: [Ingredient], steps: [String]) {
    self.title = title; self.ingredients = ingredients; self.steps = steps
  }
}

/// One step with the ingredients the Worker linked to it.
public struct LinkedStep: Codable, Sendable, Equatable {
  public let index: Int
  public let text: String
  public let ingredients: [String]
  public init(index: Int, text: String, ingredients: [String]) { self.index = index; self.text = text; self.ingredients = ingredients }
}

/// One line of the conversation so far.
public struct HistoryLine: Codable, Sendable, Equatable {
  public enum Who: String, Codable, Sendable { case cook, coach }
  public let who: Who
  public let text: String
  public init(who: Who, text: String) { self.who = who; self.text = text }
}

/// What `/v1/turn` takes.
public struct TurnRequest: Codable, Sendable, Equatable {
  public let sessionId: String
  public let stepIndex: Int
  public let utterance: String
  /// Base64 JPEG frames.
  public let frames: [String]
  public let seen: [String]
  /// The conversation so far, oldest first; the Worker takes at most 12 lines.
  public var history: [HistoryLine]? = nil
}

/// The coach's call on the current step, sent after its answer.
public enum Decision: String, Sendable { case next, stay, hold }

/// What `/v1/turn` streams back, in order: maybe an ack, text pieces, then done or an error.
public enum CoachEvent: Sendable, Equatable {
  case ack(String)
  case text(String)
  case action(Decision)
  case done
  case error(String)
}

/// What `/v1/observe` takes: the newest frame, the previous look to compare with, and the newest log lines.
public struct ObserveRequest: Codable, Sendable, Equatable {
  public let sessionId: String
  public let stepIndex: Int
  /// Base64 JPEG, ≤ 640 px on its long side.
  public let frame: String
  public let previous: String?
  public let recent: [String]
}

/// What a look really used, from the model's own count — the basis for the cost discussion.
public struct ObserveUsage: Codable, Sendable, Equatable {
  public let input: Int
  public let cachedInput: Int
  public let output: Int
  public init(input: Int, cachedInput: Int, output: Int) { self.input = input; self.cachedInput = cachedInput; self.output = output }
  /// Cents, at muse-spark-1.3 standard prices ($1.25/M input, $0.15/M cached, $4.25/M output).
  public var cents: Double { (Double(input - cachedInput) * 1.25 + Double(cachedInput) * 0.15 + Double(output) * 4.25) / 10_000 }
}

/// One look's answer: what's new, a line to say only for a clear mistake, and whether the cook has stepped away.
public struct ObserveResult: Codable, Sendable, Equatable {
  public let events: [String]
  public let interject: String?
  public let away: Bool
  public let usage: ObserveUsage
  public init(events: [String], interject: String?, away: Bool, usage: ObserveUsage) {
    self.events = events; self.interject = interject; self.away = away; self.usage = usage
  }
}

/// The mind's call on the step: keep going, move on, or hold the place while the cook is away.
public enum StepCall: String, Codable, Sendable {
  case stay, next, hold
  public init(from decoder: Decoder) throws {
    self = StepCall(rawValue: (try? decoder.singleValueContainer().decode(String.self)) ?? "") ?? .stay
  }
}

/// What `/v1/mind` takes: one wake of the mind, with everything a person beside the cook would know.
public struct MindRequest: Codable, Sendable, Equatable {
  public let sessionId: String
  public let stepIndex: Int
  public let wake: WakeReason
  /// The newest timeline lines ("1:05 cook: is it done?"), at most 50.
  public let timeline: [String]
  /// Seconds since anyone last spoke.
  public let quietFor: Double
  public var held: Bool = false
  public var finished: Bool = false
  /// Eye wakes: the newest frame and the previous one the mind looked at (base64 JPEG ≤ 640 px).
  public var frame: String? = nil
  public var previous: String? = nil
  /// Spoken wakes: the cook's words and the frames to judge them by.
  public var utterance: String? = nil
  public var frames: [String]? = nil
}

/// One eye wake's answer: what it newly saw, a line to say now (most often none), and its call on the step.
public struct MindAnswer: Codable, Sendable, Equatable {
  public let seen: [String]
  public let say: String?
  public let step: StepCall
  public let usage: ObserveUsage
  public init(seen: [String], say: String?, step: StepCall, usage: ObserveUsage) {
    self.seen = seen; self.say = say; self.step = step; self.usage = usage
  }
}
