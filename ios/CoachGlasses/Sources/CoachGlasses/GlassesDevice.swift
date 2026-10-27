import CoachKit
import Foundation
import MWDATCamera
import MWDATCore
import UIKit

/// Ray-Ban Meta glasses as the coach's eyes. Streams the camera at medium (504×896) and `fps` — Meta notes lower
/// settings give clearer frames, since Bluetooth compresses less — and keeps each frame as JPEG for the coach.
/// Folding, taking the glasses off or another app taking the camera shows up as `.paused`, with a reason to say.
@MainActor
public final class GlassesDevice: CoachDevice {
  public private(set) var status: DeviceStatus = .starting
  private var buffer = FrameBuffer(capacity: 120)
  private let fps: UInt
  private var session: DeviceSession?
  private var camera: Camera?
  private var tokens = ListenerTokenBag()

  /// `fps` must be one the toolkit accepts: 2, 7, 15, 24 or 30.
  public init(fps: UInt = 2) { self.fps = fps }

  /// Call once at launch, before anything else touches the glasses.
  public static func configure() throws { try Wearables.configure() }

  /// Forward Meta AI's callback URL (registration and permission flows) to the toolkit.
  public static func handle(_ url: URL) async {
    guard URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?
      .contains(where: { $0.name == "metaWearablesAction" }) == true else { return }
    _ = try? await Wearables.shared.handleUrl(url)
  }

  public func start() async throws {
    let wearables = Wearables.shared
    if wearables.registrationState != .registered {
      try await wearables.startRegistration()
      for await state in wearables.registrationStateStream() where state == .registered { break }
    }
    if try await wearables.checkPermissionStatus(.camera) != .granted {
      guard try await wearables.requestPermission(.camera) == .granted else {
        status = .disconnected("Camera permission wasn't granted in the Meta AI app."); return
      }
    }

    let session = try wearables.createSession(deviceSelector: AutoDeviceSelector(wearables: wearables))
    self.session = session
    Task { [weak self] in
      for await state in session.stateStream() { self?.sessionChanged(state) }
    }
    try session.start()
    for await state in session.stateStream() where state == .started { break }

    guard let camera = try session.addCamera(config: StreamConfiguration(videoCodec: .raw, resolution: .medium, frameRate: fps)) else {
      status = .disconnected("The glasses' camera couldn't start."); return
    }
    self.camera = camera
    camera.stream.videoFramePublisher.listen { [weak self] frame in
      // Off the main thread: encode here, hand only the JPEG over.
      guard let jpeg = frame.makeUIImage()?.jpegData(compressionQuality: 0.5) else { return }
      let now = Date()
      Task { @MainActor in self?.buffer.push(jpeg, at: now) }
    }.store(in: tokens)
    camera.stream.statePublisher.listen { [weak self] state in
      Task { @MainActor in self?.streamChanged(state) }
    }.store(in: tokens)
    camera.stream.errorPublisher.listen { [weak self] error in
      Task { @MainActor in self?.status = .paused(error.localizedDescription) }
    }.store(in: tokens)
    camera.stream.start()
  }

  public func stop() {
    camera?.stop()
    session?.stop()
    tokens = ListenerTokenBag()
    status = .disconnected("Stopped.")
  }

  public func recent(_ n: Int) -> [Data] { buffer.last(n) }
  public func across(since date: Date, max: Int) -> [Data] { buffer.sampled(since: date, max: max) }

  private func sessionChanged(_ state: DeviceSessionState) {
    switch state {
    case .paused: status = .paused("Glasses paused — I'll pick up when they're back.")
    case .stopped: status = .disconnected("Glasses disconnected — I'll pick up when they're back.")
    default: break
    }
  }

  private func streamChanged(_ state: StreamState) {
    switch state {
    case .streaming: status = .ready
    case .paused: status = .paused("Glasses paused — I'll pick up when they're back.")
    case .waitingForDevice: status = .starting
    default: break
    }
  }
}
