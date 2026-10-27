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

/// What `/v1/turn` takes.
public struct TurnRequest: Codable, Sendable, Equatable {
  public let sessionId: String
  public let stepIndex: Int
  public let utterance: String
  /// Base64 JPEG frames.
  public let frames: [String]
  public let seen: [String]
}

/// What `/v1/turn` streams back, in order: maybe an ack, text pieces, then done or an error.
public enum CoachEvent: Sendable, Equatable {
  case ack(String)
  case text(String)
  case done
  case error(String)
}
