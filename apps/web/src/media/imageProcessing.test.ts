import { describe, expect, it } from "vitest";
import { calculateWatermarkLayout } from "./imageProcessing";

describe("calculateWatermarkLayout", () => {
  it("keeps the logo inside a landscape image", () => {
    const layout = calculateWatermarkLayout(2_000, 1_200, 600, 240);

    expect(layout.width).toBe(320);
    expect(layout.height).toBe(128);
    expect(layout.x).toBeGreaterThanOrEqual(0);
    expect(layout.y).toBeGreaterThanOrEqual(0);
    expect(layout.x + layout.width).toBeLessThan(2_000);
    expect(layout.y + layout.height).toBeLessThan(1_200);
  });

  it("keeps a readable watermark on thumbnails", () => {
    const layout = calculateWatermarkLayout(480, 320, 600, 240);

    expect(layout.width).toBe(106);
    expect(layout.height).toBe(42);
    expect(layout.x + layout.width).toBeLessThan(480);
    expect(layout.y + layout.height).toBeLessThan(320);
  });

  it("never overflows very small images", () => {
    const layout = calculateWatermarkLayout(24, 12, 600, 240);

    expect(layout.x).toBeGreaterThanOrEqual(0);
    expect(layout.y).toBeGreaterThanOrEqual(0);
    expect(layout.x + layout.width).toBeLessThanOrEqual(24);
    expect(layout.y + layout.height).toBeLessThanOrEqual(12);
  });
});
