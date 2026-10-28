/**
 * A JPEG's pixel size, read from its frame header (SOF), or null if it isn't a JPEG we can read. Meta bills images by
 * their pixels, so the observer checks dimensions rather than trusting byte counts (security review, 2026-10-27).
 */
export function jpegSize(base64: string): { width: number; height: number } | null {
  let bin: string;
  try { bin = atob(base64); } catch { return null; }
  const at = (i: number) => bin.charCodeAt(i);
  if (bin.length < 4 || at(0) !== 0xff || at(1) !== 0xd8) return null;
  let i = 2;
  while (i + 3 < bin.length) {
    if (at(i) !== 0xff) return null;
    const marker = at(i + 1);
    // SOF0–SOF15 carry the size, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (i + 8 >= bin.length) return null;
      return { height: (at(i + 5) << 8) | at(i + 6), width: (at(i + 7) << 8) | at(i + 8) };
    }
    const length = (at(i + 2) << 8) | at(i + 3);
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}
