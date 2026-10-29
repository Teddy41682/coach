import Foundation
import Testing
@testable import CoachKit

@Suite struct EarsTests {
  @Test func readsMusesEvents() {
    #expect(MuseEvent.decode(#"{"sessionId":"abc"}"#) == .ready)
    #expect(MuseEvent.decode(#"{"type":"speechStart"}"#) == .hearing(""))
    #expect(MuseEvent.decode(#"{"type":"partialTranscript","transcript":"Is the"}"#) == .hearing("Is the"))
    #expect(MuseEvent.decode(#"{"type":"speechEnd","audioProcessedMs":1200}"#) == .other)
    #expect(MuseEvent.decode(#"{"type":"speechComplete","transcript":"Is the pan hot?"}"#) == .finished("Is the pan hot?"))
    #expect(MuseEvent.decode(#"{"type":"error","message":"bad audio"}"#) == .failed("bad audio"))
    #expect(MuseEvent.decode("not json") == .other)
  }

  @Test func cutsAudioIntoHundredMillisecondFrames() {
    var c = PCMChunker()
    #expect(c.add(Data(count: 3_000)).isEmpty)
    let frames = c.add(Data(count: 7_000))
    #expect(frames.map(\.count) == [4_800, 4_800])
    #expect(c.add(Data(count: 400)).map(\.count) == [])
    #expect(c.add(Data(count: 4_400)).map(\.count) == [4_800])
  }

  @Test func theMicrophoneIsShutWhileTheCoachTalksAndJustAfter() {
    let g = EchoGate()
    let stopped = Date(timeIntervalSince1970: 100)
    #expect(!g.open(coachTalking: true, coachStoppedAt: .distantPast, now: stopped))
    #expect(!g.open(coachTalking: false, coachStoppedAt: stopped, now: stopped.addingTimeInterval(0.1)))
    #expect(g.open(coachTalking: false, coachStoppedAt: stopped, now: stopped.addingTimeInterval(0.3)))
  }
}
