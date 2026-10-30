import Testing
@testable import CoachKit

@Suite struct SentencesTests {
  @Test func takesCompleteSentencesAndKeepsTheRest() {
    var buf = "Mix a bit more. It's still"
    #expect(completeSentences(&buf) == ["Mix a bit more."])
    #expect(buf == " It's still")
  }
  @Test func questionAndExclamationMarksEndSentences() {
    var buf = "Nearly there! Is it smooth? Yes"
    #expect(completeSentences(&buf) == ["Nearly there!", "Is it smooth?"])
  }
  @Test func aDecimalIsNotAnEnd() {
    var buf = "Add 1.5 cups of flour. Then"
    #expect(completeSentences(&buf) == ["Add 1.5 cups of flour."])
  }
  @Test func abbreviationsAreNotEnds() {
    var buf = "Use a spice, e.g. paprika, for colour. Next"
    #expect(completeSentences(&buf) == ["Use a spice, e.g. paprika, for colour."])
  }
  @Test func anOpeningClauseGoesOutOnceFourWordsAreInFrontOfADash() {
    var buf = "That landed on the plate — scrape"
    #expect(openingClause(&buf) == "That landed on the plate —")
    #expect(buf == "scrape")
    var short = "Yeah, those are tortillas"
    #expect(openingClause(&short) == nil)
    var sentence = "Good. Now the edges, all round"
    #expect(openingClause(&sentence) == nil)
  }

  @Test func aDashDoesNotEndASentence() {
    var buf = "Not quite yet — the egg white"
    #expect(completeSentences(&buf).isEmpty)
  }
  @Test func aFullStopAtTheVeryEndWaitsForWhatFollows() {
    // "1." could become "1.5" in the next chunk; only a following space confirms the end.
    var buf = "Add 1."
    #expect(completeSentences(&buf).isEmpty)
  }
}
