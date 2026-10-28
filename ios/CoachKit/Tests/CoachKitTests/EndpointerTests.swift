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
    #expect(e.tick(at: at(1.5)) == nil)               // 1.0 s of quiet: not yet (people pause mid-sentence)
    #expect(e.tick(at: at(1.6)) == "is this mixed")   // 1.1 s: done
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
    #expect(e.tick(at: at(11.7)) == "what's next")
  }

  @Test func blankPartialsAreNotUtterances() {
    var e = Endpointer()
    e.heard("   ", at: at(0), coachTalking: false)
    #expect(e.tick(at: at(2)) == nil)
  }

  @Test func isHearingWhileTheCookIsMidSentence() {
    var e = Endpointer()
    #expect(!e.isHearing)
    e.heard("how much", at: at(1), coachTalking: false)
    #expect(e.isHearing)
    _ = e.tick(at: at(2.2))
    #expect(!e.isHearing)
  }
}
