import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Property, UniversityLocation } from "@saknaha/shared-types";
import UniversityToPropertyDirectionsButton from "./UniversityToPropertyDirectionsButton";

const university: UniversityLocation = {
  id: "kku-quraiger",
  universityId: "kku",
  universityName: "جامعة الملك خالد",
  name: "جامعة الملك خالد - قريقر",
  city: "أبها",
  label: "قريقر",
  lat: 18.2462,
  lng: 42.5075,
  active: true,
};

const property = {
  id: "property-1",
  city: "أبها",
  neighborhood: "حي النزهة",
  lat: 18.22,
  lng: 42.51,
} as Property;

describe("UniversityToPropertyDirectionsButton", () => {
  it("renders a safe new-tab directions link with an Arabic accessible label", () => {
    const html = renderToStaticMarkup(
      <UniversityToPropertyDirectionsButton property={property} selectedUniversity={university} />,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("الاتجاهات من جامعة الملك خالد - قريقر إلى السكن");
    expect(html).toContain("travelmode=driving");
  });

  it("does not build a link when no university is selected", () => {
    const html = renderToStaticMarkup(
      <UniversityToPropertyDirectionsButton property={property} selectedUniversity={null} />,
    );
    expect(html).not.toContain("google.com/maps/dir");
    expect(html).toContain("اختاري جامعتك لعرض المسار");
  });

  it("shows a non-blocking message when property coordinates are missing", () => {
    const html = renderToStaticMarkup(
      <UniversityToPropertyDirectionsButton
        property={{ ...property, lat: undefined, lng: undefined }}
        selectedUniversity={university}
      />,
    );
    expect(html).not.toContain("google.com/maps/dir");
    expect(html).toContain("موقع السكن غير متوفر حالياً");
  });

  it("uses the linked property's coordinates for a roommate opportunity", () => {
    const roommateProperty = { ...property, id: "roommate-linked-property" };
    const html = renderToStaticMarkup(
      <UniversityToPropertyDirectionsButton
        property={roommateProperty}
        selectedUniversity={university}
      />,
    );
    expect(html).toContain("destination=18.22%2C42.51");
  });

  it("does not build a link for an inactive campus", () => {
    const html = renderToStaticMarkup(
      <UniversityToPropertyDirectionsButton
        property={property}
        selectedUniversity={{ ...university, active: false }}
      />,
    );
    expect(html).not.toContain("google.com/maps/dir");
  });

  it("does not expose exact directions for an approximate public property", () => {
    const html = renderToStaticMarkup(
      <UniversityToPropertyDirectionsButton
        property={{ ...property, locationVisibility: "approximate" }}
        selectedUniversity={university}
      />,
    );
    expect(html).not.toContain("google.com/maps/dir");
    expect(html).toContain("الموقع التقريبي لا يتيح اتجاهات دقيقة");
  });

  it("keeps the approved RTL-friendly full-width mobile action", () => {
    const html = renderToStaticMarkup(
      <UniversityToPropertyDirectionsButton property={property} selectedUniversity={university} />,
    );
    expect(html).toContain("w-full");
    expect(html).toContain("focus-visible:outline");
  });
});
