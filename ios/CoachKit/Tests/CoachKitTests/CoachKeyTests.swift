import Foundation
import Testing
@testable import CoachKit

/// Answers each request from a script of statuses, and keeps the keys it was sent.
final class StubProtocol: URLProtocol, @unchecked Sendable {
  nonisolated(unsafe) static var statuses: [Int] = []
  nonisolated(unsafe) static var keys: [String] = []
  static let lock = NSLock()

  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    let status = Self.lock.withLock {
      Self.keys.append(request.value(forHTTPHeaderField: "X-Coach-Key") ?? "")
      return Self.statuses.isEmpty ? 200 : Self.statuses.removeFirst()
    }
    let body = Data(#"{"sessionId":"s1","steps":[]}"#.utf8)
    let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!
    client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: body)
    client?.urlProtocolDidFinishLoading(self)
  }
  override func stopLoading() {}
}

/// Hands out "k1", "k2", … one per fetch.
actor Tokens {
  private(set) var fetched = 0
  func next() -> String { fetched += 1; return "k\(fetched)" }
}

@Suite(.serialized) struct CoachKeyTests {
  private func client(_ key: CoachKey) -> CoachClient {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [StubProtocol.self]
    return CoachClient(base: URL(string: "https://coach.test")!, device: "d", key: key, urls: URLSession(configuration: config))
  }
  private func script(_ statuses: [Int]) { StubProtocol.lock.withLock { StubProtocol.statuses = statuses; StubProtocol.keys = [] } }
  private var sent: [String] { StubProtocol.lock.withLock { StubProtocol.keys } }
  private let recipe = CoachRecipe(title: "Toast", ingredients: [], steps: ["Toast it."])

  @Test func aRefusedTokenIsFetchedAfreshAndTheCallRetried() async throws {
    script([401, 200])
    let tokens = Tokens()
    let c = client(CoachKey(fetch: { await tokens.next() }))
    let started = try await c.start(recipe)
    #expect(started.sessionId == "s1")
    #expect(sent == ["k1", "k2"])
    #expect(await tokens.fetched == 2)
  }

  @Test func theFreshTokenIsKeptForLaterCalls() async throws {
    script([401, 200, 200])
    let tokens = Tokens()
    let c = client(CoachKey(fetch: { await tokens.next() }))
    _ = try await c.start(recipe)
    _ = try await c.start(recipe)
    #expect(sent == ["k1", "k2", "k2"])
  }

  @Test func refusedTwiceFails() async throws {
    script([401, 401])
    let tokens = Tokens()
    let c = client(CoachKey(fetch: { await tokens.next() }))
    await #expect(throws: URLError.self) { _ = try await c.start(recipe) }
    #expect(sent == ["k1", "k2"])
  }

  @Test func aFixedKeyIsNeverRetried() async throws {
    script([401])
    let c = client(CoachKey(fixed: "app"))
    await #expect(throws: URLError.self) { _ = try await c.start(recipe) }
    #expect(sent == ["app"])
  }

  @Test func aStreamRetriesWithAFreshTokenToo() async throws {
    script([401, 200])
    let tokens = Tokens()
    let c = client(CoachKey(fetch: { await tokens.next() }))
    for try await _ in c.turn(TurnRequest(sessionId: "s1", stepIndex: 0, utterance: "hi", frames: [], seen: [])) {}
    #expect(sent == ["k1", "k2"])
  }
}
