import Foundation
import Testing
@testable import CoachKit

@Suite struct EndpointerTests {
  let t0 = Date(timeIntervalSince1970: 1_000)
  func at(_ s: Double) -> Date { t0.addingTimeInterval(s) }

  @Test func anUtteranceEndsAfterSilence() {
    var e = Endpointer()
    e.heard("is this", at: at(0), coachTalking: false)
    e.heard("is this mixed", at: at(0.5), coachTalking: false)
    #expect(e.tick(at: at(1.2)) == nil)               // 0.7 s of quiet: not yet
    #expect(e.tick(at: at(1.3)) == "is this mixed")   // 0.8 s: done
    #expect(e.tick(at: at(5)) == nil)                 // and only once
  }

  @Test func whatTheMicHearsWhileTheCoachTalksIsIgnored() {
    var e = Endpointer()
    e.heard("let me take a look", at: at(0), coachTalking: true)
    #expect(e.tick(at: at(2)) == nil)
  }

  @Test func theEchoJustAfterTheCoachStopsIsIgnored() {
    var e = Endpointer()
    e.coachStopped(at: at(10))
    e.heard("a look", at: at(10.2), coachTalking: false)     // 200 ms after: the tail of its own voice
    #expect(e.tick(at: at(11.5)) == nil)
    e.heard("what's next", at: at(10.5), coachTalking: false) // 500 ms after: the cook
    #expect(e.tick(at: at(11.5)) == "what's next")
  }

  @Test func blankPartialsAreNotUtterances() {
    var e = Endpointer()
    e.heard("   ", at: at(0), coachTalking: false)
    #expect(e.tick(at: at(2)) == nil)
  }
}
