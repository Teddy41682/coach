import CoreGraphics
import Foundation
import ImageIO

/// A JPEG shrunk to at most `maxSide` px on its long side, for the observer: the model bills by pixels, and the
/// Worker refuses anything over 1024. A frame already small enough is re-encoded at its size. Nil if it isn't an image.
public func downscaleJPEG(_ data: Data, maxSide: Int = 640, quality: Double = 0.6) -> Data? {
  guard let src = CGImageSourceCreateWithData(data as CFData, nil),
        let image = CGImageSourceCreateThumbnailAtIndex(src, 0, [
          kCGImageSourceCreateThumbnailFromImageAlways: true,
          kCGImageSourceCreateThumbnailWithTransform: true,
          kCGImageSourceThumbnailMaxPixelSize: maxSide,
        ] as CFDictionary)
  else { return nil }
  let out = NSMutableData()
  guard let dest = CGImageDestinationCreateWithData(out, "public.jpeg" as CFString, 1, nil) else { return nil }
  CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
  return CGImageDestinationFinalize(dest) ? out as Data : nil
}
