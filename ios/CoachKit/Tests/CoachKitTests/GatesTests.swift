import Foundation
import Testing
@testable import CoachKit

@Suite struct GatesTests {
  let t0 = Date(timeIntervalSince1970: 1_000)
  let step = "Spread the peanut butter on one slice, right to the edges."

  @Test func rewordingsOfOneCueOverlap() {
    #expect(overlap("Push it right out to the edges.", "Work it right out to the edges.") >= LineGate.sameAs)
    #expect(overlap("Scrape that off the plate onto the slice.", "Leave a tiny border for the jelly.") < LineGate.sameAs)
  }

  /// Katie's PB&J: "spread it on one slice, right to the edges" again and again.
  @Test func theStepReadBackIsNeverACue() {
    var g = LineGate()
    do { let r = g.allows("Spread that on one slice, right to the edges.", kind: .cue, step: 1, stepText: step, at: t0); #expect(!r) }
  }

  @Test func aCueSaidOnceIsNotSaidAgainInNewWords() {
    var g = LineGate()
    do { let r = g.allows("Push it into the corners.", kind: .cue, step: 1, stepText: step, at: t0); #expect(r) }
    g.spoke("Push it into the corners.", step: 1, at: t0)
    do { let r = g.allows("Get it into those corners too.", kind: .cue, step: 1, stepText: step, at: t0.addingTimeInterval(20)); #expect(!r) }
  }

  @Test func cuesWaitSixSecondsAfterTheCoachLastSpokeAndStopAtThreeAStep() {
    var g = LineGate()
    g.spoke("Next, spread the peanut butter.", step: 1, at: t0)
    do { let r = g.allows("Good scoop.", kind: .cue, step: 1, stepText: step, at: t0.addingTimeInterval(3)); #expect(!r) }
    let lines = ["Good scoop.", "Thin at the crust.", "Even out the middle.", "Lovely colour."]
    var passed = 0
    for (i, l) in lines.enumerated() where g.allows(l, kind: .cue, step: 1, stepText: step, at: t0.addingTimeInterval(10 + Double(i) * 10)) {
      passed += 1
      g.spoke(l, step: 1, at: t0.addingTimeInterval(10 + Double(i) * 10))
    }
    #expect(passed == LineGate.perStep)
  }

  @Test func mistakesAndAFinishedStepAlwaysPass() {
    var g = LineGate()
    g.spoke("Next, spread the peanut butter on one slice.", step: 1, at: t0)
    do { let r = g.allows("That's on the plate — spread it on one slice.", kind: .mistake, step: 1, stepText: step, at: t0.addingTimeInterval(1)); #expect(r) }
    do { let r = g.allows("Edge to edge — done.", kind: .done, step: 1, stepText: step, at: t0.addingTimeInterval(1)); #expect(r) }
  }

  @Test func aNewStepStartsAFreshBudget() {
    var g = LineGate()
    for i in 0..<3 { _ = g.allows("Cue number \(["alpha", "bravo", "charlie"][i]).", kind: .cue, step: 1, stepText: step, at: t0.addingTimeInterval(Double(i) * 10)) }
    do { let r = g.allows("Thin layer of jelly.", kind: .cue, step: 2, stepText: "Spread the jelly.", at: t0.addingTimeInterval(40)); #expect(r) }
  }

  /// Every utterance from Katie's run, as Muse heard it: asides go unanswered, questions to the coach don't.
  @Test func asidesAreNotAnsweredQuestionsAre() {
    let to = { (w: String, since: Double) in Addressed.toCoach(w, name: "Serena", sinceCoachSpoke: since) }
    #expect(to("Good, how's yours?", 3))
    #expect(!to("Can you", 0.5))
    #expect(to("Can I use a dirty plate?", 5))
    #expect(!to("wash the plate.", 12))
    #expect(!to("the dirty", 2))
    #expect(!to("Too much", 1))
    #expect(!to("Maybe she thinks I'm dumb.", 2))
    #expect(to("Okay, tell me when it looks good Serena.", 30))
    #expect(to("How does that look?", 20))
    #expect(!to("she stopped talking.", 20))
  }
}
