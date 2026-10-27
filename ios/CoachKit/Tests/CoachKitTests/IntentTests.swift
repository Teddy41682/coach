import Testing
@testable import CoachKit

@Suite struct IntentTests {
  @Test(arguments: ["What's next?", "next step", "Next", "what now"])
  func next(_ s: String) { #expect(parseIntent(s) == .next) }

  @Test(arguments: ["go back", "previous step", "Go back a step"])
  func previous(_ s: String) { #expect(parseIntent(s) == .previous) }

  @Test(arguments: ["say that again", "Repeat that", "what was that?"])
  func repeatStep(_ s: String) { #expect(parseIntent(s) == .repeatStep) }

  @Test(arguments: ["done", "I'm done", "finished mixing", "OK, that's done"])
  func done(_ s: String) { #expect(parseIntent(s) == .done) }

  @Test(arguments: ["I'm back", "im back", "OK I am back"])
  func back(_ s: String) { #expect(parseIntent(s) == .back) }

  @Test func timerInWords() { #expect(parseIntent("Set a timer for twenty minutes") == .setTimer(seconds: 1200)) }
  @Test func timerInDigits() { #expect(parseIntent("timer 20 minutes") == .setTimer(seconds: 1200)) }
  @Test func timerCompoundWords() { #expect(parseIntent("set a timer for twenty five minutes") == .setTimer(seconds: 1500)) }
  @Test func timerSeconds() { #expect(parseIntent("timer for 90 seconds") == .setTimer(seconds: 90)) }
  @Test func timerHour() { #expect(parseIntent("set a timer for an hour") == .setTimer(seconds: 3600)) }

  @Test(arguments: ["set a twenty minute timer", "Set a 20-minute timer", "start a five minute timer"])
  func timerNumberFirst(_ s: String) {
    #expect([Intent.setTimer(seconds: 1200), .setTimer(seconds: 300)].contains(parseIntent(s)))
  }

  @Test(arguments: ["OK", "okay", "um", "OK OK", "  "])
  func fillerAloneIsIgnored(_ s: String) { #expect(parseIntent(s) == .ignore) }

  @Test func question() {
    #expect(parseIntent("Is this mixed enough?") == .question("Is this mixed enough?"))
  }
  /// "Did I go back far enough" is a question, not a step back: only whole commands navigate.
  @Test func navigationWordsInsideAQuestion() {
    #expect(parseIntent("is the next bit hard?") == .question("is the next bit hard?"))
  }
}
