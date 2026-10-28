import Foundation

private struct Wire: Decodable { let type: String; let text: String?; let action: String? }

/// One server-sent-events line as a coach event; nil for anything that isn't an event we know.
public func decodeEvent(line: String) throws -> CoachEvent? {
  guard line.hasPrefix("data: ") else { return nil }
  let w = try JSONDecoder().decode(Wire.self, from: Data(line.dropFirst(6).utf8))
  switch w.type {
  case "ack": return .ack(w.text ?? "")
  case "text": return .text(w.text ?? "")
  case "action": return .action(Decision(rawValue: w.action ?? "") ?? .stay)
  case "done": return .done
  case "error": return .error(w.text ?? "")
  default: return nil
  }
}

/// The Worker: start a session for a recipe, then stream each turn's events.
public struct CoachClient: Sendable {
  public let base: URL
  public let appKey: String
  public let device: String

  public init(base: URL, appKey: String, device: String) {
    self.base = base; self.appKey = appKey; self.device = device
  }

  private func request(_ path: String, _ body: some Encodable) throws -> URLRequest {
    var r = URLRequest(url: base.appending(path: path))
    r.httpMethod = "POST"
    r.setValue("application/json", forHTTPHeaderField: "Content-Type")
    r.setValue(appKey, forHTTPHeaderField: "X-Coach-Key")
    r.setValue(device, forHTTPHeaderField: "X-Coach-Device")
    r.httpBody = try JSONEncoder().encode(body)
    return r
  }

  /// The Worker said no (the day's cap, a session that isn't ours, a malformed request): not worth retrying.
  public struct Refused: Error, Equatable { public let status: Int }

  /// One eye wake of the mind. A refusal throws `Refused`; a lost connection throws as URLSession does.
  public func mind(_ m: MindRequest) async throws -> MindAnswer {
    let (data, response) = try await URLSession.shared.data(for: try request("v1/mind", m))
    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    if (400..<500).contains(status) { throw Refused(status: status) }
    guard status == 200 else { throw URLError(.badServerResponse) }
    return try JSONDecoder().decode(MindAnswer.self, from: data)
  }

  /// A spoken wake of the mind, streamed like a turn.
  public func mindTurn(_ m: MindRequest) -> AsyncThrowingStream<CoachEvent, Error> { stream("v1/mind", m) }

  private struct Started: Decodable { let sessionId: String; let steps: [LinkedStep] }

  public func start(_ recipe: CoachRecipe) async throws -> (sessionId: String, steps: [LinkedStep]) {
    struct Body: Encodable { let recipe: CoachRecipe }
    let (data, response) = try await URLSession.shared.data(for: try request("v1/session", Body(recipe: recipe)))
    guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
    let s = try JSONDecoder().decode(Started.self, from: data)
    return (s.sessionId, s.steps)
  }

  /// One background look; a refusal (the day's cap, a bad frame) throws, and the observer stays quiet.
  public func observe(_ o: ObserveRequest) async throws -> ObserveResult {
    let (data, response) = try await URLSession.shared.data(for: try request("v1/observe", o))
    guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
    return try JSONDecoder().decode(ObserveResult.self, from: data)
  }

  public func turn(_ t: TurnRequest) -> AsyncThrowingStream<CoachEvent, Error> { stream("v1/turn", t) }

  private func stream(_ path: String, _ body: some Encodable & Sendable) -> AsyncThrowingStream<CoachEvent, Error> {
    AsyncThrowingStream { continuation in
      let task = Task {
        do {
          let (bytes, response) = try await URLSession.shared.bytes(for: try request(path, body))
          guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
          for try await line in bytes.lines {
            if let e = try decodeEvent(line: line) { continuation.yield(e) }
          }
          continuation.finish()
        } catch {
          continuation.finish(throwing: error)
        }
      }
      continuation.onTermination = { _ in task.cancel() }
    }
  }
}
