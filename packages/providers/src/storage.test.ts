import { describe, expect, it } from "vitest";
import {
  hasExpectedImageSignature,
  hasExpectedVideoSignature,
  validateImageUpload,
  validateVideoUpload,
} from "./storage";

const config = {
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxUploadBytes: 1024,
};

describe("media upload validation", () => {
  it("accepts a valid image request", () => {
    expect(() =>
      validateImageUpload({ fileName: "home.webp", mimeType: "image/webp", byteSize: 512 }, config),
    ).not.toThrow();
  });

  it("rejects unsupported or oversized files", () => {
    expect(() =>
      validateImageUpload(
        { fileName: "home.svg", mimeType: "image/svg+xml", byteSize: 10 },
        config,
      ),
    ).toThrow(/not supported/);
    expect(() =>
      validateImageUpload({ fileName: "home.png", mimeType: "image/png", byteSize: 2048 }, config),
    ).toThrow(/maximum/);
  });

  it("checks image magic bytes instead of trusting the content type", () => {
    expect(hasExpectedImageSignature(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), "image/jpeg")).toBe(
      true,
    );
    expect(hasExpectedImageSignature(new TextEncoder().encode("<svg></svg>"), "image/jpeg")).toBe(
      false,
    );
  });

  it("validates video types, sizes, and magic bytes", () => {
    expect(() =>
      validateVideoUpload({ fileName: "tour.mp4", mimeType: "video/mp4", byteSize: 512 }, 1024),
    ).not.toThrow();
    expect(() =>
      validateVideoUpload({ fileName: "tour.avi", mimeType: "video/avi", byteSize: 512 }, 1024),
    ).toThrow(/not supported/);
    expect(
      hasExpectedVideoSignature(
        new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]),
        "video/mp4",
      ),
    ).toBe(true);
    expect(hasExpectedVideoSignature(new TextEncoder().encode("<html>"), "video/mp4")).toBe(false);
  });
});
