import { describe, expect, it } from "vitest";
import { jpegSize } from "../src/jpeg";

/** A minimal JPEG header: SOI, an APP0 segment, then SOF0 carrying height and width. */
function header(width: number, height: number, sof = 0xc0, sos = true): string {
  const bytes = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, sof, 0x00, 0x0b, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x01, 0x01, 0x11, 0x00,
    ...(sos ? [0xff, 0xda, 0x00, 0x02] : [])];
  return btoa(String.fromCharCode(...bytes));
}
const raw = (b64: string) => atob(b64);

describe("jpegSize", () => {
  it("reads width and height from a baseline JPEG", () => expect(jpegSize(header(640, 360))).toEqual({ width: 640, height: 360 }));
  it("reads a progressive JPEG too", () => expect(jpegSize(header(504, 896, 0xc2))).toEqual({ width: 504, height: 896 }));
  it("is null for something that isn't a JPEG", () => expect(jpegSize(btoa("not a jpeg at all"))).toBeNull());
  it("is null for a truncated header", () => expect(jpegSize(header(640, 360).slice(0, 8))).toBeNull());
  it("is null for a zero width or height", () => expect(jpegSize(header(0, 360))).toBeNull());
  it("is null when a second size header follows (a parser could read either)", () => {
    const two = atob(header(640, 360, 0xc0, false)) + atob(header(4000, 3000)).slice(2);
    expect(jpegSize(btoa(two))).toBeNull();
  });
  it("stops at the start of image data", () => {
    expect(jpegSize(btoa(raw(header(640, 360)) + "\xff\xc0garbage"))).toEqual({ width: 640, height: 360 });
  });
  it("is null when the image data never starts", () => expect(jpegSize(header(640, 360, 0xc0, false))).toBeNull());
  it("refuses fill bytes and standalone markers before the image data", () => {
    const h = raw(header(640, 360));
    for (const m of [0xff, 0x01, 0xd0, 0xd8, 0xd9]) {
      expect(jpegSize(btoa(h.slice(0, 2) + String.fromCharCode(0xff, m) + h.slice(2)))).toBeNull();
    }
  });
  it("refuses a segment that runs past the end of the file", () => {
    expect(jpegSize(btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 0x40, 0x00, 0x00)))).toBeNull();
  });
  it("refuses a size header too short to hold a size", () => {
    expect(jpegSize(btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xc0, 0x00, 0x04, 0x08, 0x01, 0xff, 0xda, 0x00, 0x02)))).toBeNull();
  });
});
