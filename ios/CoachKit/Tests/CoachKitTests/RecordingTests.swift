import Foundation
import Testing
@testable import CoachKit

@Suite struct RecordingTests {
  let t0 = Date(timeIntervalSince1970: 1_000)

  @Test func eventsAreTimedFromTheStartAndWrittenOnePerLine() throws {
    var log = RecordingLog(start: t0)
    log.add(.heard("is this mixed enough"), at: t0.addingTimeInterval(4.25))
    log.add(.said("Let me take a look."), at: t0.addingTimeInterval(4.4))
    log.add(.step(2, "Add the eggs."), at: t0.addingTimeInterval(9))
    let lines = log.jsonLines().split(separator: "\n").map(String.init)
    #expect(lines.count == 3)
    let first = try JSONSerialization.jsonObject(with: Data(lines[0].utf8)) as! [String: Any]
    #expect(first["t"] as? Double == 4.25)
    #expect(first["kind"] as? String == "heard")
    #expect(first["text"] as? String == "is this mixed enough")
    let third = try JSONSerialization.jsonObject(with: Data(lines[2].utf8)) as! [String: Any]
    #expect(third["step"] as? Int == 2)
  }

  @Test func aWakeIsRecordedWithWhyWhatItSawSaidDecidedAndCost() throws {
    var log = RecordingLog(start: t0)
    log.add(.wake(.changed, MindAnswer(seen: ["put two slices in"], say: "Toaster's on.", step: .next,
                                       usage: ObserveUsage(input: 500, cachedInput: 0, output: 300))),
            at: t0.addingTimeInterval(51))
    let o = try JSONSerialization.jsonObject(with: Data(log.jsonLines().utf8)) as! [String: Any]
    #expect(o["kind"] as? String == "wake")
    #expect(o["reason"] as? String == "changed")
    #expect(o["seen"] as? [String] == ["put two slices in"])
    #expect(o["say"] as? String == "Toaster's on.")
    #expect(o["step"] as? String == "next")
    #expect(o["output"] as? Int == 300)
    #expect(abs((o["cents"] as? Double ?? 0) - 0.19) < 0.0001)
  }

  @Test func frameNamesSortInTimeOrder() {
    let a = RecordingLog.frameName(at: 1.5), b = RecordingLog.frameName(at: 12.04)
    #expect(a == "000001500.jpg")
    #expect(a < b)
  }

  @Test func theCoachBufferIsThinnedWhileRecordingIsFull() {
    var thin = Thinner(every: 0.5)
    let kept = (0..<30).map { thin.keep(at: t0.addingTimeInterval(Double($0) / 15)) }   // 2 s at 15 fps
    #expect(kept.filter { $0 }.count == 4)   // 0, 0.53, 1.07, 1.6 → 2 per second
    #expect(kept.first == true)
  }
}
