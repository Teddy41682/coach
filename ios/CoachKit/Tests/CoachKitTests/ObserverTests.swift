import CoreGraphics
import Foundation
import ImageIO
import Testing
@testable import CoachKit

@Suite struct ObservationLogTests {
  let t0 = Date(timeIntervalSince1970: 1_000)

  @Test func formatsMinutesAndSeconds() {
    var log = ObservationLog(start: t0)
    log.append(["shook salt over the bowl"], at: t0.addingTimeInterval(51), step: 0)
    log.append(["poured the eggs in"], at: t0.addingTimeInterval(725), step: 1)
    #expect(log.forTurn() == ["0:51 shook salt over the bowl", "12:05 poured the eggs in"])
  }

  @Test func dropsAnExactRepeatWithinTenSeconds() {
    var log = ObservationLog(start: t0)
    log.append(["stirred"], at: t0.addingTimeInterval(1), step: 0)
    log.append(["stirred"], at: t0.addingTimeInterval(8), step: 0)
    log.append(["stirred"], at: t0.addingTimeInterval(20), step: 0)
    #expect(log.forTurn().count == 2)
  }

  @Test func sendsOnlyTheNewestFiftyButKeepsEverything() {
    var log = ObservationLog(start: t0)
    for i in 0..<60 { log.append(["e\(i)"], at: t0.addingTimeInterval(Double(i * 20)), step: 0) }
    #expect(log.forTurn().count == 50)
    #expect(log.forTurn().last?.hasSuffix("e59") == true)
    #expect(log.entries.count == 60)
    #expect(log.recent(10).count == 10)
  }

  @Test func keepsEveryLineWithinTheWorkersHundredCharacters() {
    var log = ObservationLog(start: t0)
    log.append([String(repeating: "x", count: 150)], at: t0.addingTimeInterval(3_600), step: 0)
    #expect(log.forTurn()[0].count <= 100)
  }

  @Test func listsAStepsEvents() {
    var log = ObservationLog(start: t0)
    log.append(["a"], at: t0, step: 0)
    log.append(["b"], at: t0.addingTimeInterval(30), step: 1)
    #expect(log.onStep(1) == ["b"])
  }
}

/// A hand-driven observer: the clock, the frame and the model's answers are set per test.
@MainActor final class ObserverRig {
  var now: Double = 0
  var frame: String? = "F"
  var answers: [ObserveResult] = []
  var sent: [ObserveRequest] = []
  var fail = false
  /// When set, an observation waits for this to be resumed (to test what happens mid-flight).
  var gate: CheckedContinuation<Void, Never>?
  var hold = false

  static func result(_ events: [String] = [], interject: String? = nil, away: Bool = false) -> ObserveResult {
    ObserveResult(events: events, interject: interject, away: away, usage: ObserveUsage(input: 500, cachedInput: 0, output: 300))
  }

  func observer() -> Observer {
    let steps = [LinkedStep(index: 0, text: "Beat the eggs with the salt.", ingredients: []),
                 LinkedStep(index: 1, text: "Cook them gently.", ingredients: [])]
    return Observer(
      sessionId: "s1", steps: steps, start: Date(timeIntervalSince1970: 0),
      observe: { [unowned self] req in
        self.sent.append(req)
        if self.hold { await withCheckedContinuation { self.gate = $0 } }
        if self.fail { throw URLError(.notConnectedToInternet) }
        return self.answers.isEmpty ? ObserverRig.result() : self.answers.removeFirst()
      },
      frame: { [unowned self] in self.frame },
      now: { [unowned self] in Date(timeIntervalSince1970: self.now) })
  }
}

@MainActor @Suite struct ObserverTests {
  let idle: () -> (step: Int, busy: Bool) = { (0, false) }

  @Test func logsWhatItSeesAndSendsTheRecentLog() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.answers = [ObserverRig.result(["shook salt over the bowl"]), ObserverRig.result()]
    rig.now = 5; _ = await o.tick(step: 0, paused: false, current: idle)
    rig.now = 8; _ = await o.tick(step: 0, paused: false, current: idle)
    #expect(o.log.forTurn() == ["0:05 shook salt over the bowl"])
    #expect(rig.sent[1].recent == ["0:05 shook salt over the bowl"])
  }

  @Test func sendsThePreviousLookForComparison() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.frame = "A"; _ = await o.tick(step: 0, paused: false, current: idle)
    rig.now = 3; rig.frame = "B"; _ = await o.tick(step: 0, paused: false, current: idle)
    #expect(rig.sent[0].previous == nil)
    #expect(rig.sent[1].previous == "A" && rig.sent[1].frame == "B")
  }

  @Test func looksEveryTwoAndAHalfSeconds() async {
    let rig = ObserverRig(); let o = rig.observer()
    _ = await o.tick(step: 0, paused: false, current: idle)
    rig.now = 2; _ = await o.tick(step: 0, paused: false, current: idle)
    rig.now = 2.5; _ = await o.tick(step: 0, paused: false, current: idle)
    #expect(rig.sent.count == 2)
  }

  @Test func skipsWhilePausedOrWithoutAFrame() async {
    let rig = ObserverRig(); let o = rig.observer()
    _ = await o.tick(step: 0, paused: true, current: idle)
    rig.frame = nil; rig.now = 3; _ = await o.tick(step: 0, paused: false, current: idle)
    #expect(rig.sent.isEmpty)
  }

  @Test func neverTwoLooksInFlight() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.hold = true
    let first = Task { await o.tick(step: 0, paused: false, current: idle) }
    while rig.gate == nil { await Task.yield() }
    rig.now = 10; _ = await o.tick(step: 0, paused: false, current: idle)
    #expect(rig.sent.count == 1)
    rig.gate?.resume(); _ = await first.value
  }

  @Test func aFailedLookIsSilent() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.fail = true
    #expect(await o.tick(step: 0, paused: false, current: idle) == nil)
    #expect(o.log.entries.isEmpty)
  }

  @Test func speaksUpAboutAMistake() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.answers = [ObserverRig.result(interject: "The pan's still cold.")]
    #expect(await o.tick(step: 0, paused: false, current: idle) == .interject("The pan's still cold."))
  }

  @Test func dropsAnInterjectionWhileTheCoachOrCookIsTalking() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.answers = [ObserverRig.result(interject: "Cold pan.")]
    #expect(await o.tick(step: 0, paused: false, current: { (0, true) }) == nil)
  }

  @Test func dropsAnInterjectionAboutAStepAlreadyLeft() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.answers = [ObserverRig.result(interject: "Cold pan.")]
    #expect(await o.tick(step: 0, paused: false, current: { (1, false) }) == nil)
  }

  @Test func interjectsAtMostOnceEveryTwentySeconds() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.answers = (0..<3).map { _ in ObserverRig.result(interject: "Cold pan.") }
    #expect(await o.tick(step: 0, paused: false, current: idle) != nil)
    rig.now = 10; #expect(await o.tick(step: 0, paused: false, current: idle) == nil)
    rig.now = 20; #expect(await o.tick(step: 0, paused: false, current: idle) != nil)
  }

  @Test func holdsThePlaceAfterThreeAwayLooksAndSaysSoOnce() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.answers = (0..<4).map { _ in ObserverRig.result(away: true) }
    #expect(await o.tick(step: 0, paused: false, current: idle) == nil)
    rig.now = 3; #expect(await o.tick(step: 0, paused: false, current: idle) == nil)
    rig.now = 6
    #expect(await o.tick(step: 0, paused: false, current: idle)
      == .away("Looks like you've stepped away. I'll hold our place at step 1 — come back when you're ready."))
    #expect(o.presence == .away)
    rig.now = 40; #expect(await o.tick(step: 0, paused: false, current: idle) == nil)
  }

  @Test func whileAwayItGlancesOnlyEveryThirtySecondsAndNeverInterjects() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.answers = (0..<3).map { _ in ObserverRig.result(away: true) } + [ObserverRig.result(interject: "Cold pan.", away: true)]
    for t in [0.0, 3, 6] { rig.now = t; _ = await o.tick(step: 0, paused: false, current: idle) }
    rig.now = 20; _ = await o.tick(step: 0, paused: false, current: idle)
    #expect(rig.sent.count == 3)
    rig.now = 36; #expect(await o.tick(step: 0, paused: false, current: idle) == nil)
    #expect(rig.sent.count == 4)
  }

  @Test func welcomesThemBackWithARecapFromTheLog() async {
    let rig = ObserverRig(); let o = rig.observer()
    rig.answers = [ObserverRig.result(["cracked 3 eggs into the bowl"])] + (0..<3).map { _ in ObserverRig.result(away: true) }
      + [ObserverRig.result()]
    for t in [0.0, 3, 6, 9] { rig.now = t; _ = await o.tick(step: 0, paused: false, current: idle) }
    rig.now = 40
    #expect(await o.tick(step: 0, paused: false, current: idle)
      == .back("Welcome back. We're on step 1: Beat the eggs with the salt. So far: cracked 3 eggs into the bowl."))
    #expect(o.presence == .present)
  }

  @Test func speakingAlsoBringsThemBack() async {
    let rig = ObserverRig(); let o = rig.observer()
    #expect(o.returned(step: 0) == nil)
    rig.answers = (0..<3).map { _ in ObserverRig.result(away: true) }
    for t in [0.0, 3, 6] { rig.now = t; _ = await o.tick(step: 0, paused: false, current: idle) }
    #expect(o.returned(step: 0) == "Welcome back. We're on step 1: Beat the eggs with the salt.")
    #expect(o.presence == .present)
  }

  @Test func addsUpWhatTheLooksReallyCost() async {
    let rig = ObserverRig(); let o = rig.observer()
    _ = await o.tick(step: 0, paused: false, current: idle)
    rig.now = 3; _ = await o.tick(step: 0, paused: false, current: idle)
    #expect(o.looks == 2)
    // 2 × (500 input at $1.25/M + 300 output at $4.25/M) = 0.3800¢
    #expect(abs(o.cents - 0.38) < 0.0001)
  }
}

@Suite struct DownscaleTests {
  func jpeg(_ w: Int, _ h: Int) -> Data {
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    ctx.setFillColor(red: 0.8, green: 0.4, blue: 0.1, alpha: 1); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    let out = NSMutableData()
    let dest = CGImageDestinationCreateWithData(out, "public.jpeg" as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, ctx.makeImage()!, nil); CGImageDestinationFinalize(dest)
    return out as Data
  }
  func size(_ d: Data) -> (Int, Int) {
    let p = CGImageSourceCopyPropertiesAtIndex(CGImageSourceCreateWithData(d as CFData, nil)!, 0, nil) as! [CFString: Any]
    return (p[kCGImagePropertyPixelWidth] as! Int, p[kCGImagePropertyPixelHeight] as! Int)
  }

  @Test func shrinksTheLongSideTo640() throws {
    let out = try #require(downscaleJPEG(jpeg(1920, 1080)))
    #expect(size(out) == (640, 360))
  }
  @Test func leavesASmallFrameAtItsSize() throws {
    let out = try #require(downscaleJPEG(jpeg(504, 896)))
    #expect(size(out) == (360, 640) || size(out) == (504, 896))
  }
  @Test func isNilForSomethingThatIsntAnImage() {
    #expect(downscaleJPEG(Data("nope".utf8)) == nil)
  }
}
