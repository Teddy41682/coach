import CoreGraphics
import Foundation
import ImageIO
import Testing
@testable import CoachKit

/// A grey JPEG with an optional lighter block, like the replay's fixtures.
func greyJPEG(width: Int = 504, height: Int = 896, base: CGFloat = 0.3, block: CGRect? = nil, blockGrey: CGFloat = 0.78) -> Data {
  let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  ctx.setFillColor(gray: base, alpha: 1); ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
  if let block { ctx.setFillColor(gray: blockGrey, alpha: 1); ctx.fill(block) }
  let out = NSMutableData()
  let dest = CGImageDestinationCreateWithData(out, "public.jpeg" as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, ctx.makeImage()!, [kCGImageDestinationLossyCompressionQuality: 0.8] as CFDictionary)
  CGImageDestinationFinalize(dest)
  return out as Data
}

@Suite struct ThumbTests {
  @Test func anImageAgainstItselfIsNoChange() throws {
    let a = try #require(Thumb.of(jpeg: greyJPEG(block: CGRect(x: 0, y: 0, width: 200, height: 300))))
    #expect(a.pixels.count == Eyes.side * Eyes.side)
    #expect(a.diff(a) == 0)
  }

  @Test func aBrighterExposureOfTheSameSceneIsAlmostNoChange() throws {
    let block = CGRect(x: 0, y: 0, width: 200, height: 300)
    let a = try #require(Thumb.of(jpeg: greyJPEG(base: 0.3, block: block, blockGrey: 0.7)))
    let b = try #require(Thumb.of(jpeg: greyJPEG(base: 0.4, block: block, blockGrey: 0.8)))
    #expect(a.diff(b) < 0.02)
  }

  @Test func aDifferentSceneIsAChange() throws {
    let a = try #require(Thumb.of(jpeg: greyJPEG(block: CGRect(x: 0, y: 0, width: 250, height: 896))))
    let b = try #require(Thumb.of(jpeg: greyJPEG(block: CGRect(x: 254, y: 0, width: 250, height: 896))))
    #expect(a.diff(b) > Eyes.change)
  }

  @Test func somethingThatIsntAnImageHasNoThumb() {
    #expect(Thumb.of(jpeg: Data("nope".utf8)) == nil)
  }
}

@Suite struct EyesTests {
  let same = Thumb(pixels: Array(repeating: 100, count: 64))
  let other = Thumb(pixels: Array(repeating: 0, count: 32) + Array(repeating: 200, count: 32))
  let t0 = Date(timeIntervalSince1970: 1_000)
  func at(_ s: Double) -> Date { t0.addingTimeInterval(s) }

  @Test func theFirstLookWakesTheMind() {
    var e = Eyes()
    #expect(e.look(same, at: at(0), busy: false) == .changed)
  }

  @Test func theSamePictureNeverWakesItUntilTheHeartbeat() {
    var e = Eyes(); e.woke(at: at(0), showing: same)
    #expect(e.look(same, at: at(10), busy: false) == nil)
    #expect(e.look(same, at: at(29.5), busy: false) == nil)
    #expect(e.look(same, at: at(30), busy: false) == .heartbeat)
  }

  @Test func aChangeWakesItOnceThePictureIsSteady() {
    var e = Eyes(); e.woke(at: at(0), showing: same)
    #expect(e.look(other, at: at(5), busy: false) == nil)
    #expect(e.look(other, at: at(5.5), busy: false) == nil)
    #expect(e.look(other, at: at(6), busy: false) == .changed)
  }

  @Test func aPictureStillMovingDoesNotWakeIt() {
    var e = Eyes(); e.woke(at: at(0), showing: same)
    for k in 0..<12 {
      let moving = Thumb(pixels: (0..<64).map { UInt8((($0 * 37) + k * 50) % 256) })
      #expect(e.look(moving, at: at(5 + Double(k) * 0.5), busy: false) == nil)
    }
  }

  @Test func eyeWakesAreAtLeastTwoAndAHalfSecondsApart() {
    var e = Eyes(); e.woke(at: at(0), showing: same)
    _ = e.look(other, at: at(0.5), busy: false)
    _ = e.look(other, at: at(1.0), busy: false)
    #expect(e.look(other, at: at(1.5), busy: false) == nil)
    #expect(e.look(other, at: at(2.5), busy: false) == .changed)
  }

  @Test func aSpokenWakeResetsTheHeartbeatButNotTheSpacing() {
    var e = Eyes(); e.woke(at: at(0), showing: same)
    e.woke(at: at(20), showing: same, eye: false)
    #expect(e.look(same, at: at(40), busy: false) == nil)
    #expect(e.look(same, at: at(50), busy: false) == .heartbeat)
  }

  @Test func nothingWhileACallIsInFlight() {
    var e = Eyes()
    #expect(e.look(same, at: at(0), busy: true) == nil)
  }
}

@Suite struct TimelineTests {
  let t0 = Date(timeIntervalSince1970: 1_000)

  @Test func linesAreTimedAndNamed() {
    var t = Timeline(start: t0)
    t.add(.cook, "is it done?", at: t0.addingTimeInterval(65))
    t.add(.saw, "put two slices in the toaster", at: t0.addingTimeInterval(70))
    t.add(.coach, "Step 2: Crack the eggs.", at: t0.addingTimeInterval(725))
    t.add(.note, "place held at step 2", at: t0.addingTimeInterval(800))
    #expect(t.lines() == ["1:05 cook: is it done?", "1:10 saw: put two slices in the toaster",
                          "12:05 coach: Step 2: Crack the eggs.", "13:20 note: place held at step 2"])
  }

  @Test func keepsEveryLineWithinTheWorkersTwoHundredCharacters() {
    var t = Timeline(start: t0)
    t.add(.coach, String(repeating: "x", count: 300), at: t0.addingTimeInterval(3_600))
    #expect(t.lines()[0].count <= 200)
  }

  @Test func clipsByTheWorkersCountNotBySwiftsCharacters() {
    // The Worker counts UTF-16 units: an emoji near the end must not push a clipped line over 200.
    var t = Timeline(start: t0)
    t.add(.coach, String(repeating: "x", count: 185) + String(repeating: "🍳", count: 20), at: t0)
    #expect(t.lines()[0].utf16.count <= 200)
  }

  @Test func sendsTheNewestFiftyButKeepsEverything() {
    var t = Timeline(start: t0)
    for i in 0..<60 { t.add(.saw, "e\(i)", at: t0.addingTimeInterval(Double(i * 20))) }
    #expect(t.lines().count == 50)
    #expect(t.lines().last?.hasSuffix("e59") == true)
    #expect(t.entries.count == 60)
  }

  @Test func theSameSightWithinTenSecondsIsOneMoment() {
    var t = Timeline(start: t0)
    t.add(.saw, "stirred", at: t0.addingTimeInterval(1))
    t.add(.saw, "stirred", at: t0.addingTimeInterval(8))
    t.add(.saw, "stirred", at: t0.addingTimeInterval(20))
    t.add(.coach, "Stir.", at: t0.addingTimeInterval(21))
    t.add(.coach, "Stir.", at: t0.addingTimeInterval(22))
    #expect(t.lines().count == 4)
  }
}
