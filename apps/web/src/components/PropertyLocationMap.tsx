import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import type { Property, UniversityLocation } from "@saknaha/shared-types";
import {
  getPropertyCoordinatesForViewer,
  isValidCoordinates,
  straightLineDistanceKm,
} from "@saknaha/utils/directions";
import UniversityReferenceSelector from "./UniversityReferenceSelector";
import UniversityToPropertyDirectionsButton from "./UniversityToPropertyDirectionsButton";
import { getFeatureFlags } from "../config/featureFlags";

interface PropertyLocationMapProps {
  property: Property;
  selectedUniversity: UniversityLocation | null;
  onUniversityChange: (university: UniversityLocation | null) => void;
  className?: string;
  allowExactLocation?: boolean;
}

const markerStyle = {
  university: { dot: "#7f3b75", ring: "rgba(127,59,117,.22)" },
  property: { dot: "#25856f", ring: "rgba(37,133,111,.22)" },
};

export default function PropertyLocationMap({
  property,
  selectedUniversity,
  onUniversityChange,
  className = "mt-5",
  allowExactLocation = false,
}: PropertyLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const coordinates = getPropertyCoordinatesForViewer(property, allowExactLocation);
  const universityCoordinates = useMemo(
    () =>
      selectedUniversity?.active && isValidCoordinates(selectedUniversity)
        ? { lat: selectedUniversity.lat, lng: selectedUniversity.lng }
        : null,
    [selectedUniversity],
  );
  const coordinateLat = coordinates?.lat;
  const coordinateLng = coordinates?.lng;
  const enabled = getFeatureFlags()["maps.universityDirections.enabled"];

  useEffect(() => {
    if (
      !enabled ||
      !mapContainer.current ||
      ((coordinateLat === undefined || coordinateLng === undefined) && !universityCoordinates)
    )
      return;
    mapInstance.current?.remove();
    mapInstance.current = null;
    const initialCoordinates =
      coordinateLat !== undefined && coordinateLng !== undefined
        ? { lat: coordinateLat, lng: coordinateLng }
        : universityCoordinates!;
    const points: L.LatLngExpression[] = [];
    const map = L.map(mapContainer.current, {
      center: [initialCoordinates.lat, initialCoordinates.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    mapInstance.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    L.control.zoom({ position: "bottomleft" }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

    if (coordinateLat !== undefined && coordinateLng !== undefined) {
      addMarker(map, coordinateLat, coordinateLng, property.neighborhood, "property");
      points.push([coordinateLat, coordinateLng]);
    }
    if (selectedUniversity && universityCoordinates) {
      addMarker(
        map,
        universityCoordinates.lat,
        universityCoordinates.lng,
        selectedUniversity.name,
        "university",
      );
      points.push([universityCoordinates.lat, universityCoordinates.lng]);
    }
    if (points.length > 1) {
      L.polyline(points, {
        color: markerStyle.property.dot,
        weight: 3,
        opacity: 0.75,
        dashArray: "8 8",
      }).addTo(map);
      map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 14 });
    }
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver.observe(mapContainer.current);
    const frame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      map.remove();
      if (mapInstance.current === map) mapInstance.current = null;
    };
  }, [
    coordinateLat,
    coordinateLng,
    enabled,
    property.neighborhood,
    selectedUniversity,
    universityCoordinates,
  ]);

  useEffect(
    () => () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    },
    [],
  );

  if (!enabled) return null;

  const distance =
    coordinates && universityCoordinates
      ? straightLineDistanceKm(universityCoordinates, coordinates)
      : Number.NaN;

  return (
    <section
      className={`${className} rounded-3xl border border-stone-200 bg-white p-4 text-right shadow-sm md:p-6`}
      dir="rtl"
    >
      <div className="grid gap-5">
        <div>
          <h2 className="text-2xl font-black text-ink">الموقع والاتجاهات</h2>
          <p className="mt-2 text-sm font-bold text-stone-600">
            {property.city}، {property.neighborhood}
          </p>
          {coordinates || universityCoordinates ? (
            <div
              ref={mapContainer}
              className="mt-4 h-[280px] w-full overflow-hidden rounded-2xl border border-sky-100 sm:h-[340px] lg:h-[390px]"
              role="img"
              aria-label={`خريطة توضح ${coordinates ? "موقع السكن" : "موقع فرع الجامعة"}${coordinates && selectedUniversity ? ` وفرع ${selectedUniversity.name}` : ""}`}
            />
          ) : (
            <div className="mt-4 flex h-[220px] items-center justify-center rounded-2xl bg-stone-100 p-6 text-center text-sm font-bold text-stone-600">
              موقع السكن غير متوفر حالياً
            </div>
          )}
        </div>
        <div className="grid content-start gap-4 rounded-2xl bg-linen p-4">
          <UniversityReferenceSelector
            selectedUniversity={selectedUniversity}
            onChange={onUniversityChange}
            city={property.city}
            compact
          />
          {selectedUniversity && universityCoordinates ? (
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-stone-500">مرجع موقعك الحالي</p>
              <p className="mt-1 font-black text-ink">{selectedUniversity.name}</p>
              {Number.isFinite(distance) ? (
                <p className="mt-2 text-sm font-bold text-mintdeep">
                  المسافة التقريبية بخط مستقيم:{" "}
                  {distance.toLocaleString("ar-SA", { maximumFractionDigits: 1 })} كم
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-2xl bg-white p-4 text-sm font-bold text-stone-600">
              اختاري الجامعة والفرع ليظهر مسار القيادة.
            </p>
          )}
          <UniversityToPropertyDirectionsButton
            property={property}
            selectedUniversity={selectedUniversity}
            allowExactLocation={allowExactLocation}
          />
          <div className="flex flex-wrap gap-3 text-xs font-bold text-stone-600">
            {universityCoordinates ? (
              <Legend color={markerStyle.university.dot} label="الجامعة" />
            ) : null}
            {coordinates ? <Legend color={markerStyle.property.dot} label="السكن" /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function addMarker(
  map: L.Map,
  lat: number,
  lng: number,
  label: string,
  kind: keyof typeof markerStyle,
) {
  const style = markerStyle[kind];
  const icon = L.divIcon({
    className: "",
    html: `<span style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:9999px;background:${style.ring}"><span style="width:12px;height:12px;border-radius:9999px;background:${style.dot};box-shadow:0 6px 16px rgba(31,41,55,.22)"></span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  const tooltip = document.createElement("span");
  tooltip.dir = "rtl";
  tooltip.textContent = label;
  L.marker([lat, lng], { icon })
    .addTo(map)
    .bindTooltip(tooltip, {
      direction: "top",
      offset: [0, -10],
      className: "saknaha-map-tooltip",
    });
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
