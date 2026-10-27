import Testing
@testable import CoachKit

@Suite struct SSETests {
  @Test func decodesEachKind() throws {
    #expect(try decodeEvent(line: #"data: {"type":"ack","text":"Let me see."}"#) == .ack("Let me see."))
    #expect(try decodeEvent(line: #"data: {"type":"text","text":"Mix more."}"#) == .text("Mix more."))
    #expect(try decodeEvent(line: #"data: {"type":"done"}"#) == .done)
    #expect(try decodeEvent(line: #"data: {"type":"error","text":"Sorry"}"#) == .error("Sorry"))
    #expect(try decodeEvent(line: #"data: {"type":"action","action":"next"}"#) == .action(.next))
    #expect(try decodeEvent(line: #"data: {"type":"action","action":"stay"}"#) == .action(.stay))
  }
  @Test func ignoresNonDataLines() throws {
    #expect(try decodeEvent(line: "") == nil)
    #expect(try decodeEvent(line: ": keep-alive") == nil)
  }
  @Test func anUnknownTypeIsSkippedNotFatal() throws {
    #expect(try decodeEvent(line: #"data: {"type":"newthing"}"#) == nil)
  }
}
