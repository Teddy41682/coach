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

/// Where the Worker key comes from: one fixed app key (the demo app), or a host app's short-lived token, asked for
/// on first use and asked for afresh once when the Worker answers 401. A token lasts an hour and a cook can run
/// longer (J'habite, 2026-10-29): without the refresh every call after the hour was refused and the coach went dumb.
actor CoachKey {
  private let fetch: (@Sendable () async throws -> String)?
  private var current: String?

  init(fixed: String) { current = fixed; fetch = nil }
  init(fetch: @escaping @Sendable () async throws -> String) { self.fetch = fetch }

  var refreshes: Bool { fetch != nil }

  func value() async throws -> String {
    if let current { return current }
    return try await fresh()
  }

  /// A new key, unless another call already replaced the one that was refused.
  func fresh(replacing refused: String? = nil) async throws -> String {
    if let refused, let current, current != refused { return current }
    guard let fetch else { return current ?? "" }
    let key = try await fetch()
    current = key
    return key
  }
}

/// The Worker: start a session for a recipe, then stream each turn's events.
public struct CoachClient: Sendable {
  public let base: URL
  public let device: String
  let key: CoachKey
  let urls: URLSession

  public init(base: URL, appKey: String, device: String) {
    self.init(base: base, device: device, key: CoachKey(fixed: appKey), urls: .shared)
  }

  /// A host app's short-lived key (J'habite's per-account token): fetched when first needed, and fetched again
  /// once, with the call retried, whenever the Worker answers 401.
  public init(base: URL, device: String, key: @escaping @Sendable () async throws -> String) {
    self.init(base: base, device: device, key: CoachKey(fetch: key), urls: .shared)
  }

  init(base: URL, device: String, key: CoachKey, urls: URLSession) {
    self.base = base; self.device = device; self.key = key; self.urls = urls
  }

  /// The key this client sends now (fetching it if none has been yet).
  public func currentKey() async throws -> String { try await key.value() }

  func request(_ path: String, _ body: some Encodable, key: String) throws -> URLRequest {
    var r = URLRequest(url: base.appending(path: path))
    r.httpMethod = "POST"
    r.setValue("application/json", forHTTPHeaderField: "Content-Type")
    r.setValue(key, forHTTPHeaderField: "X-Coach-Key")
    r.setValue(device, forHTTPHeaderField: "X-Coach-Device")
    r.httpBody = try JSONEncoder().encode(body)
    return r
  }

  /// One call with the current key; on a 401 with a refreshable key, once more with a fresh one.
  func keyed<T>(_ call: (String) async throws -> (T, Int)) async throws -> (T, Int) {
    let first = try await key.value()
    let (value, status) = try await call(first)
    guard status == 401, await key.refreshes else { return (value, status) }
    return try await call(try await key.fresh(replacing: first))
  }

  private func post(_ path: String, _ body: some Encodable) async throws -> (Data, Int) {
    try await keyed { k in
      let (data, response) = try await urls.data(for: try request(path, body, key: k))
      return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }
  }

  /// The Worker said no (the day's cap, a session that isn't ours, a malformed request): not worth retrying.
  public struct Refused: Error, Equatable { public let status: Int }

  /// One eye wake of the mind. A refusal throws `Refused`; a lost connection throws as URLSession does.
  public func mind(_ m: MindRequest) async throws -> MindAnswer {
    let (data, status) = try await post("v1/mind", m)
    if (400..<500).contains(status) { throw Refused(status: status) }
    guard status == 200 else { throw URLError(.badServerResponse) }
    return try JSONDecoder().decode(MindAnswer.self, from: data)
  }

  /// A spoken wake of the mind, streamed like a turn.
  public func mindTurn(_ m: MindRequest) -> AsyncThrowingStream<CoachEvent, Error> { stream("v1/mind", m) }

  private struct Started: Decodable { let sessionId: String; let steps: [LinkedStep] }

  public func start(_ recipe: CoachRecipe) async throws -> (sessionId: String, steps: [LinkedStep]) {
    struct Body: Encodable { let recipe: CoachRecipe }
    let (data, status) = try await post("v1/session", Body(recipe: recipe))
    guard status == 200 else { throw URLError(.badServerResponse) }
    let s = try JSONDecoder().decode(Started.self, from: data)
    return (s.sessionId, s.steps)
  }

  /// One background look; a refusal (the day's cap, a bad frame) throws, and the observer stays quiet.
  public func observe(_ o: ObserveRequest) async throws -> ObserveResult {
    let (data, status) = try await post("v1/observe", o)
    guard status == 200 else { throw URLError(.badServerResponse) }
    return try JSONDecoder().decode(ObserveResult.self, from: data)
  }

  public func turn(_ t: TurnRequest) -> AsyncThrowingStream<CoachEvent, Error> { stream("v1/turn", t) }

  private func stream(_ path: String, _ body: some Encodable & Sendable) -> AsyncThrowingStream<CoachEvent, Error> {
    AsyncThrowingStream { continuation in
      let task = Task {
        do {
          let (bytes, status) = try await keyed { k in
            let (bytes, response) = try await urls.bytes(for: try request(path, body, key: k))
            return (bytes, (response as? HTTPURLResponse)?.statusCode ?? 0)
          }
          guard status == 200 else { throw URLError(.badServerResponse) }
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
