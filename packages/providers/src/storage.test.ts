import { describe, expect, it } from "vitest";
import { hasExpectedImageSignature, validateImageUpload } from "./storage";

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
});
