import Foundation
import Testing
@testable import CoachKit

/// Records what the session says and what it sends; a hand-turned clock fires timers on demand.
@MainActor final class Rig {
  var said: [String] = []
  var turns: [TurnRequest] = []
  var reply: [CoachEvent] = [.ack("Let me see."), .text("Looks good."), .action(.stay), .done]
  var failConnection = false
  /// When set, the turn's stream is fed by hand through this continuation (for timing tests).
  var manual: AsyncThrowingStream<CoachEvent, Error>.Continuation?
  var useManual = false
  var pending: [(Double, @MainActor () -> Void)] = []
  var now: Double = 0
  var needs: [CoachSession.FrameNeed] = []
  var seen: [String] = []

  func session(steps: [String] = ["Whisk the flour.", "Add the eggs.", "Rest it."]) -> CoachSession {
    let recipe = CoachRecipe(title: "Pancakes", ingredients: [], steps: steps)
    let linked = steps.enumerated().map { LinkedStep(index: $0.offset, text: $0.element, ingredients: []) }
    return CoachSession(
      recipe: recipe, sessionId: "s1", steps: linked,
      send: { [unowned self] t in
        self.turns.append(t)
        let events = self.reply, fail = self.failConnection
        if self.useManual {
          let (stream, c) = AsyncThrowingStream.makeStream(of: CoachEvent.self)
          self.manual = c
          return stream
        }
        return AsyncThrowingStream { c in
          if fail { c.finish(throwing: URLError(.notConnectedToInternet)); return }
          events.forEach { c.yield($0) }; c.finish()
        }
      },
      say: { [unowned self] in self.said.append($0) },
      frames: { [unowned self] need in self.needs.append(need); return ["F"] },
      seen: { [unowned self] in self.seen },
      schedule: { [unowned self] secs, fire in self.pending.append((self.now + secs, fire)) },
      now: { [unowned self] in Date(timeIntervalSince1970: self.now) })
  }
  func advance(_ secs: Double) {
    now += secs
    let due = pending.filter { $0.0 <= now }
    pending.removeAll { $0.0 <= now }
    due.forEach { $0.1() }
  }
}

@MainActor @Suite struct CoachSessionTests {
  @Test func everyTurnCarriesTheObserversLog() async {
    let rig = Rig(); let s = rig.session()
    rig.seen = ["0:51 shook salt over the bowl"]
    await s.handle(.question("did I add the salt?"))
    #expect(rig.turns.last?.seen == ["0:51 shook salt over the bowl"])
  }

  @Test func whatTheObserverSaysJoinsTheConversation() async {
    let rig = Rig(); let s = rig.session()
    s.noteCoach("The pan's still cold.")
    await s.handle(.question("ok?"))
    #expect(rig.turns.last?.history?.first == HistoryLine(who: .coach, text: "The pan's still cold."))
  }

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
    // The answer arrived at once, so the ack was never needed (spec: ack only on a real wait).
    #expect(rig.said.suffix(2) == ["Step 2: Add the eggs.", "Looks good."])
  }

  @Test func doneReviewsTheWholeStepAQuestionLooksNow() async {
    let rig = Rig(); let s = rig.session()
    rig.now = 100
    await s.handle(.next)            // step 2 starts at t=100
    rig.now = 160
    await s.handle(.done)
    await s.handle(.question("ok?"))
    #expect(rig.needs == [.acrossStep(since: Date(timeIntervalSince1970: 100)), .recent])
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

  @Test func fragmentsAreSpokenAsWholeSentences() async {
    let rig = Rig()
    rig.reply = [.ack("Let me see."), .text("Not quite yet —"), .text(" the egg white is missing. Add"), .text(" it, then beat."), .done]
    let s = rig.session()
    await s.handle(.question("ok?"))
    #expect(rig.said == ["Not quite yet — the egg white is missing.", "Add it, then beat."])
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

  @Test func theCoachsNextAdvancesAndReadsTheStep() async {
    let rig = Rig(); rig.reply = [.text("That's drained, nice."), .action(.next), .done]
    let s = rig.session()
    await s.handle(.question("is it drained?"))
    #expect(s.stepIndex == 1)
    #expect(rig.said.suffix(2) == ["That's drained, nice.", "Step 2: Add the eggs."])
  }

  @Test func stayStaysPut() async {
    let rig = Rig(); rig.reply = [.text("Tilt it toward me."), .action(.stay), .done]
    let s = rig.session()
    await s.handle(.question("is it drained?"))
    #expect(s.stepIndex == 0)
  }

  @Test func theConversationTravelsWithEachTurnCappedAtTwelve() async {
    let rig = Rig(); rig.reply = [.text("Fine."), .action(.stay), .done]
    let s = rig.session()
    for n in 0..<10 { await s.handle(.question("q\(n)")) }
    let last = rig.turns.last!
    #expect(last.history?.count == 12)
    #expect(last.history?.last == HistoryLine(who: .coach, text: "Fine."))
    #expect(last.history?.contains(HistoryLine(who: .cook, text: "q8")) == true)
    #expect(last.utterance == "q9")
  }

  @Test func aQuickAnswerHasNoAck() async {
    let rig = Rig(); rig.reply = [.ack("Let me see."), .text("Fine."), .action(.stay), .done]
    let s = rig.session()
    await s.handle(.question("ok?"))
    rig.advance(5)
    #expect(rig.said == ["Fine."])
  }

  @Test func aSlowAnswerIsCoveredByTheAck() async {
    let rig = Rig(); rig.useManual = true
    let s = rig.session()
    let turn = Task { await s.handle(.question("ok?")) }
    while rig.manual == nil { await Task.yield() }
    rig.manual?.yield(.ack("Let me see."))
    for _ in 0..<5 { await Task.yield() }
    rig.advance(1.4)
    rig.manual?.yield(.text("Fine."))
    rig.manual?.yield(.action(.stay)); rig.manual?.yield(.done); rig.manual?.finish()
    await turn.value
    #expect(rig.said.count == 2)
    #expect(CoachSession.acks.contains(rig.said[0]))
    #expect(rig.said[1] == "Fine.")
  }

  /// A slow turn, fed by hand: ack at `ackAt` seconds in, answer after.
  func slowTurn(_ rig: Rig, _ s: CoachSession, at start: Double) async {
    rig.now = start
    rig.useManual = true; rig.manual = nil
    let turn = Task { await s.handle(.question("ok?")) }
    while rig.manual == nil { await Task.yield() }
    rig.manual?.yield(.ack("Let me take a look."))
    for _ in 0..<5 { await Task.yield() }
    rig.advance(1.4)
    rig.manual?.yield(.text("Fine.")); rig.manual?.yield(.action(.stay)); rig.manual?.yield(.done); rig.manual?.finish()
    await turn.value
  }

  @Test func acksVaryAndNeverRepeatBackToBack() async {
    let rig = Rig(); let s = rig.session()
    await slowTurn(rig, s, at: 0)
    await slowTurn(rig, s, at: 30)
    let acks = rig.said.filter { CoachSession.acks.contains($0) }
    #expect(acks.count == 2)
    #expect(acks[0] != acks[1])
  }

  @Test func noAckAgainWithinFifteenSeconds() async {
    let rig = Rig(); let s = rig.session()
    await slowTurn(rig, s, at: 0)
    await slowTurn(rig, s, at: 8)
    #expect(rig.said.filter { CoachSession.acks.contains($0) }.count == 1)
  }

  @Test func aStrayLineBreakIsNotSpoken() async {
    let rig = Rig(); rig.reply = [.text("Looks right.\n"), .action(.stay), .done]
    let s = rig.session()
    await s.handle(.question("ok?"))
    #expect(rig.said == ["Looks right."])
    #expect(s.history.last == HistoryLine(who: .coach, text: "Looks right."))
  }

  @Test func theEndIsSaidOnce() async {
    let rig = Rig(); rig.reply = [.text("All mixed."), .action(.next), .done]
    let s = rig.session(steps: ["Only step."])
    await s.handle(.question("done?"))          // the coach's next finishes the recipe
    await s.handle(.next)                       // the cook asks again
    await s.handle(.question("bye"))            // and the coach says next again
    #expect(rig.said.filter { $0 == "That was the last step. Enjoy it." }.count == 1)
  }
}
