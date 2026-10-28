/**
 * A JPEG's pixel size, read from its frame header (SOF), or null if it isn't a JPEG we can read strictly. Meta bills
 * images by their pixels, so the observer checks dimensions rather than trusting byte counts (security review,
 * 2026-10-27). Strict on purpose: every segment up to the image data (SOS) must be a length-carrying marker that
 * fits in the file, fill bytes and standalone markers are refused (a camera never writes them there), there is
 * exactly one SOF holding a non-zero size, and SOS must be reached. This is a guard, not the ceiling — each look is
 * also charged by the cost Meta reports (src/index.ts), so a header that lies still can't run up the bill.
 */
export function jpegSize(base64: string): { width: number; height: number } | null {
  let bin: string;
  try { bin = atob(base64); } catch { return null; }
  const at = (i: number) => bin.charCodeAt(i);
  if (bin.length < 4 || at(0) !== 0xff || at(1) !== 0xd8) return null;
  let size: { width: number; height: number } | null = null;
  let i = 2;
  while (i + 3 < bin.length) {
    if (at(i) !== 0xff) return null;
    const marker = at(i + 1);
    if (marker === 0xda) return size; // start of scan: image data follows
    // Fill bytes, TEM, RST0–7, a second SOI, EOI: none belong before SOS in a camera frame.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) return null;
    const length = (at(i + 2) << 8) | at(i + 3);
    if (length < 2 || i + 2 + length > bin.length) return null;
    // SOF0–SOF15 carry the size, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (size || length < 8) return null;
      size = { height: (at(i + 5) << 8) | at(i + 6), width: (at(i + 7) << 8) | at(i + 8) };
      if (!size.width || !size.height) return null;
    }
    i += 2 + length;
  }
  return null;
}
