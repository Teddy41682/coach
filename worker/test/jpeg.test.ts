import { describe, expect, it } from "vitest";
import { jpegSize } from "../src/jpeg";

/** A minimal JPEG header: SOI, an APP0 segment, then SOF0 carrying height and width. */
function header(width: number, height: number, sof = 0xc0): string {
  const bytes = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, sof, 0x00, 0x0b, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x01, 0x01, 0x11, 0x00];
  return btoa(String.fromCharCode(...bytes));
}

describe("jpegSize", () => {
  it("reads width and height from a baseline JPEG", () => expect(jpegSize(header(640, 360))).toEqual({ width: 640, height: 360 }));
  it("reads a progressive JPEG too", () => expect(jpegSize(header(504, 896, 0xc2))).toEqual({ width: 504, height: 896 }));
  it("is null for something that isn't a JPEG", () => expect(jpegSize(btoa("not a jpeg at all"))).toBeNull());
  it("is null for a truncated header", () => expect(jpegSize(header(640, 360).slice(0, 8))).toBeNull());
  it("is null for a zero width or height", () => expect(jpegSize(header(0, 360))).toBeNull());
  it("is null when a second size header follows (a parser could read either)", () => {
    const two = atob(header(640, 360)) + atob(header(4000, 3000)).slice(2);
    expect(jpegSize(btoa(two))).toBeNull();
  });
  it("stops at the start of image data", () => {
    const sos = String.fromCharCode(0xff, 0xda, 0x00, 0x02) + "\xff\xc0garbage";
    expect(jpegSize(btoa(atob(header(640, 360)) + sos))).toEqual({ width: 640, height: 360 });
  });
});
