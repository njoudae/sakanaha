import { Navigation } from "lucide-react";
import type { Property, UniversityLocation } from "@saknaha/shared-types";
import {
  buildGoogleMapsDirectionsUrl,
  getDirectionsPropertyCoordinates,
  getPropertyCoordinatesForViewer,
} from "@saknaha/utils/directions";

interface UniversityToPropertyDirectionsButtonProps {
  property: Property;
  selectedUniversity: UniversityLocation | null;
  allowExactLocation?: boolean;
}

export default function UniversityToPropertyDirectionsButton({
  property,
  selectedUniversity,
  allowExactLocation = false,
}: UniversityToPropertyDirectionsButtonProps) {
  const visiblePropertyCoordinates = getPropertyCoordinatesForViewer(property, allowExactLocation);
  const propertyCoordinates = getDirectionsPropertyCoordinates(property, allowExactLocation);
  const directionsUrl =
    selectedUniversity?.active && propertyCoordinates
      ? buildGoogleMapsDirectionsUrl(selectedUniversity, propertyCoordinates)
      : null;

  if (!visiblePropertyCoordinates) {
    return (
      <p
        className="rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-600"
        role="status"
      >
        موقع السكن غير متوفر حالياً
      </p>
    );
  }

  if (!propertyCoordinates) {
    return (
      <p
        className="rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-600"
        role="status"
      >
        الموقع التقريبي لا يتيح اتجاهات دقيقة
      </p>
    );
  }

  if (!directionsUrl) {
    return (
      <button className="secondary-button w-full" type="button" disabled>
        <Navigation size={18} aria-hidden="true" />
        اختاري جامعتك لعرض المسار
      </button>
    );
  }

  return (
    <a
      className="primary-button w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
      href={directionsUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`الاتجاهات من ${selectedUniversity?.name ?? "الجامعة"} إلى السكن`}
    >
      <Navigation size={18} aria-hidden="true" />
      الاتجاهات من الجامعة
    </a>
  );
}
