import Foundation
import Testing
@testable import CoachKit

/// Records what the session says and what it sends; a hand-turned clock fires timers on demand.
@MainActor final class Rig {
  var said: [String] = []
  var turns: [TurnRequest] = []
  var reply: [CoachEvent] = [.ack("Let me see."), .text("Looks good."), .done]
  var failConnection = false
  var pending: [(Double, @MainActor () -> Void)] = []
  var now: Double = 0

  func session(steps: [String] = ["Whisk the flour.", "Add the eggs.", "Rest it."]) -> CoachSession {
    let recipe = CoachRecipe(title: "Pancakes", ingredients: [], steps: steps)
    let linked = steps.enumerated().map { LinkedStep(index: $0.offset, text: $0.element, ingredients: []) }
    return CoachSession(
      recipe: recipe, sessionId: "s1", steps: linked,
      send: { [unowned self] t in
        self.turns.append(t)
        let events = self.reply, fail = self.failConnection
        return AsyncThrowingStream { c in
          if fail { c.finish(throwing: URLError(.notConnectedToInternet)); return }
          events.forEach { c.yield($0) }; c.finish()
        }
      },
      say: { [unowned self] in self.said.append($0) },
      frames: { ["F"] },
      schedule: { [unowned self] secs, fire in self.pending.append((self.now + secs, fire)) })
  }
  func advance(_ secs: Double) {
    now += secs
    let due = pending.filter { $0.0 <= now }
    pending.removeAll { $0.0 <= now }
    due.forEach { $0.1() }
  }
}

@MainActor @Suite struct CoachSessionTests {
  @Test func nextSpeaksTheNextStepWithoutTheNetwork() async {
    let rig = Rig(); let s = rig.session()
    await s.handle(.next)
    #expect(s.stepIndex == 1)
    #expect(rig.said.last == "Step 2: Add the eggs.")
    #expect(rig.turns.isEmpty)
  }

  @Test func nextOnTheLastStepFinishes() async {
    let rig = Rig(); let s = rig.session(steps: ["Only step."])
    await s.handle(.next)
    #expect(s.phase == .finished)
    #expect(rig.said.last == "That was the last step. Enjoy it.")
  }

  @Test func previousStopsAtTheFirstStep() async {
    let rig = Rig(); let s = rig.session()
    await s.handle(.previous)
    #expect(s.stepIndex == 0)
    #expect(rig.said.last == "Step 1: Whisk the flour.")
  }

  @Test func doneAsksTheCoachToCheckTheCurrentStepWithFrames() async {
    let rig = Rig(); let s = rig.session()
    await s.handle(.next)
    await s.handle(.done)
    #expect(rig.turns.count == 1)
    #expect(rig.turns[0].stepIndex == 1)
    #expect(rig.turns[0].frames == ["F"])
    #expect(rig.said.suffix(2) == ["Let me see.", "Looks good."])
  }

  @Test func aQuestionCarriesTheWordsAsSpoken() async {
    let rig = Rig(); let s = rig.session()
    await s.handle(.question("Is this mixed enough?"))
    #expect(rig.turns[0].utterance == "Is this mixed enough?")
  }

  @Test func anErrorIsSpoken() async {
    let rig = Rig(); rig.reply = [.ack("Let me see."), .error("Sorry, I lost that — ask me again.")]
    let s = rig.session()
    await s.handle(.question("ok?"))
    #expect(rig.said.last == "Sorry, I lost that — ask me again.")
  }

  @Test func aLostConnectionIsSpokenNotSilent() async {
    let rig = Rig(); rig.failConnection = true
    let s = rig.session()
    await s.handle(.question("ok?"))
    #expect(rig.said.last == "Sorry, I lost that — ask me again.")
  }

  @Test func aTimerWaitsThenSpeaks() async {
    let rig = Rig(); let s = rig.session()
    await s.handle(.setTimer(seconds: 1200))
    #expect(s.phase == .waiting)
    #expect(rig.said.last == "Timer set for 20 minutes.")
    rig.advance(1199)
    #expect(rig.said.last == "Timer set for 20 minutes.")
    rig.advance(1)
    #expect(rig.said.last == "Your 20-minute timer is up — let's check.")
    #expect(s.phase == .cooking)
  }
}
