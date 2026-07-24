import { describe, expect, it } from "vitest";
import type { Property, UniversityLocation } from "@saknaha/shared-types";
import {
  buildGoogleMapsDirectionsUrl,
  getDirectionsPropertyCoordinates,
  getApprovedPropertyCoordinates,
  getPropertyCoordinatesForViewer,
  isLikelySwappedSaudiCoordinate,
  isValidCoordinates,
  parseGoogleMapsLocationUrl,
  resolveGoogleMapsLocationUrl,
} from "./directions";

const university: UniversityLocation = {
  id: "branch-1",
  universityId: "university-1",
  name: "فرع الجامعة",
  city: "أبها",
  label: "الفرع الرئيسي",
  lat: 18.2462,
  lng: 42.5075,
  active: true,
};

const property = {
  lat: 18.22,
  lng: 42.51,
  locationVisibility: "exact",
} as Property;

describe("university directions", () => {
  it("builds an encoded Google Maps driving URL from valid coordinates", () => {
    const url = buildGoogleMapsDirectionsUrl(university, { lat: 18.22, lng: 42.51 });
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=18.2462%2C42.5075&destination=18.22%2C42.51&travelmode=driving",
    );
  });

  it.each([
    [{ lat: 91, lng: 0 }],
    [{ lat: -91, lng: 0 }],
    [{ lat: 0, lng: 181 }],
    [{ lat: 0, lng: -181 }],
    [{ lat: Number.NaN, lng: 0 }],
    [{ lat: Number.POSITIVE_INFINITY, lng: 42 }],
    [{ lat: 0, lng: 0 }],
  ])("rejects invalid coordinates", (coordinates) => {
    expect(isValidCoordinates(coordinates)).toBe(false);
    expect(buildGoogleMapsDirectionsUrl(university, coordinates)).toBeNull();
  });

  it("does not expose a private property location", () => {
    expect(
      getApprovedPropertyCoordinates({ ...property, locationVisibility: "private" }),
    ).toBeNull();
  });

  it("allows approved approximate coordinates", () => {
    expect(
      getApprovedPropertyCoordinates({
        ...property,
        lat: 18.224567,
        lng: 42.516789,
        locationVisibility: "approximate",
      }),
    ).toEqual({
      lat: 18.22,
      lng: 42.52,
    });
  });

  it("does not generate exact directions from approximate or private public locations", () => {
    expect(
      getDirectionsPropertyCoordinates({ ...property, locationVisibility: "approximate" }),
    ).toBeNull();
    expect(
      getDirectionsPropertyCoordinates({ ...property, locationVisibility: "private" }),
    ).toBeNull();
    expect(
      getDirectionsPropertyCoordinates({ ...property, locationVisibility: "private" }, true),
    ).toEqual({
      lat: 18.22,
      lng: 42.51,
    });
  });

  it("redacts a private location for guests and exposes it to an authorized viewer", () => {
    const privateProperty = { ...property, locationVisibility: "private" } as Property;
    expect(getPropertyCoordinatesForViewer(privateProperty, false)).toBeNull();
    expect(getPropertyCoordinatesForViewer(privateProperty, true)).toEqual({
      lat: 18.22,
      lng: 42.51,
    });
  });

  it("does not create a route without property coordinates", () => {
    expect(
      getApprovedPropertyCoordinates({ ...property, lat: undefined, lng: undefined }),
    ).toBeNull();
  });

  it("supports universities with multiple branches and changing the reference", () => {
    const secondBranch = { ...university, id: "branch-2", lat: 18.1706, lng: 42.6254 };
    const firstUrl = buildGoogleMapsDirectionsUrl(university, { lat: 18.22, lng: 42.51 });
    const secondUrl = buildGoogleMapsDirectionsUrl(secondBranch, { lat: 18.22, lng: 42.51 });
    expect(firstUrl).not.toBe(secondUrl);
  });

  it("works without any paid maps provider configuration", () => {
    expect(buildGoogleMapsDirectionsUrl(university, { lat: 18.22, lng: 42.51 })).toContain(
      "google.com/maps/dir",
    );
  });

  it.each([
    ["https://www.google.com/maps/@18.2462,42.5075,15z"],
    ["https://maps.google.com/?q=18.2462,42.5075"],
    ["https://www.google.com/maps/place/test/data=!3d18.2462!4d42.5075"],
  ])("parses supported full Google Maps URLs", (value) => {
    expect(parseGoogleMapsLocationUrl(value)).toMatchObject({
      ok: true,
      coordinates: { lat: 18.2462, lng: 42.5075 },
    });
  });

  it.each([
    "javascript:alert(1)",
    "https://evil.example/maps/@18.2,42.5,15z",
    "https://google.com.evil.example/maps/@18.2,42.5,15z",
    "https://maps.app.goo.gl/abcdef",
    "https://www.google.com/maps?q=0,0",
    "not a url",
  ])("rejects malformed, shortened, or malicious map URLs", (value) => {
    expect(parseGoogleMapsLocationUrl(value).ok).toBe(false);
  });

  it("flags coordinates that look swapped for a Saudi listing", () => {
    expect(isLikelySwappedSaudiCoordinate({ lat: 42.5075, lng: 18.2462 })).toBe(true);
    expect(
      parseGoogleMapsLocationUrl("https://www.google.com/maps?q=42.5075,18.2462"),
    ).toMatchObject({
      ok: false,
      reason: "suspected_swap",
    });
  });

  it("resolves an approved Google Maps short link before extracting coordinates", async () => {
    const response = new Response("", { status: 200 });
    Object.defineProperty(response, "url", {
      value: "https://www.google.com/maps/@24.7225,46.6271,15z",
    });
    const result = await resolveGoogleMapsLocationUrl(
      "https://maps.app.goo.gl/example",
      async () => response,
    );
    expect(result).toMatchObject({
      ok: true,
      coordinates: { lat: 24.7225, lng: 46.6271 },
    });
  });
});
