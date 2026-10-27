import Foundation
import Testing
@testable import CoachKit

@Suite struct FrameBufferTests {
  let t0 = Date(timeIntervalSince1970: 1_000)
  func frame(_ n: Int) -> Data { Data([UInt8(n)]) }

  @Test func keepsOnlyTheNewestUpToCapacity() {
    var b = FrameBuffer(capacity: 3)
    for i in 0..<5 { b.push(frame(i), at: t0.addingTimeInterval(Double(i))) }
    #expect(b.last(10) == [frame(2), frame(3), frame(4)])
  }

  @Test func lastReturnsTheNewestNInOrder() {
    var b = FrameBuffer(capacity: 10)
    for i in 0..<5 { b.push(frame(i), at: t0.addingTimeInterval(Double(i))) }
    #expect(b.last(2) == [frame(3), frame(4)])
  }

  @Test func samplesEvenlyAcrossEverythingSinceATime() {
    var b = FrameBuffer(capacity: 100)
    for i in 0..<20 { b.push(frame(i), at: t0.addingTimeInterval(Double(i))) }
    // Since t=10: frames 10…19. Four evenly spaced, always including the first and the newest.
    #expect(b.sampled(since: t0.addingTimeInterval(10), max: 4) == [frame(10), frame(13), frame(16), frame(19)])
  }

  @Test func samplingFewerFramesThanAskedReturnsThemAll() {
    var b = FrameBuffer(capacity: 100)
    for i in 0..<3 { b.push(frame(i), at: t0.addingTimeInterval(Double(i))) }
    #expect(b.sampled(since: t0, max: 6) == [frame(0), frame(1), frame(2)])
  }

  @Test func emptyIsEmpty() {
    let b = FrameBuffer(capacity: 5)
    #expect(b.last(3).isEmpty)
    #expect(b.sampled(since: t0, max: 3).isEmpty)
  }

  @Test func zeroOrOneAsked() {
    var b = FrameBuffer(capacity: 10)
    for i in 0..<5 { b.push(frame(i), at: t0.addingTimeInterval(Double(i))) }
    #expect(b.sampled(since: t0, max: 0).isEmpty)
    #expect(b.sampled(since: t0, max: 1) == [frame(4)])
  }
}
