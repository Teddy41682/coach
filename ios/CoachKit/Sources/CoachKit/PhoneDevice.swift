#if os(iOS)
@preconcurrency import AVFoundation
import CoreImage
import UIKit

/// The phone's back camera as the coach's eyes — for a phone on a tripod, and for judges without glasses.
/// Frames are thinned to `fps`, scaled to `longSide` and kept as JPEG, like the glasses' frames.
@MainActor
public final class PhoneDevice: NSObject, CoachDevice {
  public private(set) var status: DeviceStatus = .starting
  private var buffer = FrameBuffer(capacity: 120)
  private var thin = Thinner(every: 0.5)
  public var onFrame: (@MainActor (Data, Date) -> Void)?
  private let session = AVCaptureSession()
  private let queue = DispatchQueue(label: "coach.phone.frames")
  private let fps: Double
  private let longSide: CGFloat
  nonisolated(unsafe) private var lastKept = Date.distantPast
  nonisolated private let context = CIContext()

  public init(fps: Double = 2, longSide: CGFloat = 1280) {
    self.fps = fps; self.longSide = longSide
    super.init()
  }

  public func start() async throws {
    guard await AVCaptureDevice.requestAccess(for: .video) else {
      status = .disconnected("Camera access is off for this app."); return
    }
    guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
          let input = try? AVCaptureDeviceInput(device: camera) else {
      status = .disconnected("No camera found."); return
    }
    session.beginConfiguration()
    session.sessionPreset = .hd1280x720
    if session.canAddInput(input) { session.addInput(input) }
    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = true
    output.setSampleBufferDelegate(self, queue: queue)
    if session.canAddOutput(output) { session.addOutput(output) }
    output.connection(with: .video)?.videoRotationAngle = 90
    session.commitConfiguration()
    let s = session
    queue.async { s.startRunning() }
    status = .ready
  }

  public func stop() {
    let s = session
    queue.async { s.stopRunning() }
    status = .disconnected("Stopped.")
  }

  public func recent(_ n: Int) -> [Data] { buffer.last(n) }
  public func across(since date: Date, max: Int) -> [Data] { buffer.sampled(since: date, max: max) }

  fileprivate func keep(_ jpeg: Data, at date: Date) {
    onFrame?(jpeg, date)
    if thin.keep(at: date) { buffer.push(jpeg, at: date) }
  }
}

extension PhoneDevice: AVCaptureVideoDataOutputSampleBufferDelegate {
  nonisolated public func captureOutput(_ output: AVCaptureOutput, didOutput sample: CMSampleBuffer, from connection: AVCaptureConnection) {
    let now = Date()
    guard now.timeIntervalSince(lastKept) >= 1 / fps, let pixels = CMSampleBufferGetImageBuffer(sample) else { return }
    lastKept = now
    let image = CIImage(cvPixelBuffer: pixels)
    let scale = longSide / max(image.extent.width, image.extent.height)
    let scaled = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    guard let jpeg = context.jpegRepresentation(of: scaled, colorSpace: CGColorSpaceCreateDeviceRGB(),
                                                options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.5]) else { return }
    Task { @MainActor in self.keep(jpeg, at: now) }
  }
}
#endif
