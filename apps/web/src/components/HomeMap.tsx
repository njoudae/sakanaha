import L from "leaflet";
import { useEffect, useRef } from "react";

type MarkerKind = "university" | "property";

const mapMarkers: Array<{
  label: string;
  lat: number;
  lng: number;
  kind: MarkerKind;
}> = [
  {
    label: "جامعة الملك خالد - الفرعاء",
    lat: 18.0839171,
    lng: 42.7071518,
    kind: "university",
  },
  {
    label: "جامعة الملك خالد للبنات",
    lat: 18.1876674,
    lng: 42.6900109,
    kind: "university",
  },
  {
    label: "جامعة الملك خالد - قريقر",
    lat: 18.2500512,
    lng: 42.5581421,
    kind: "university",
  },
  {
    label: "حي البديع",
    lat: 18.215239,
    lng: 42.581762,
    kind: "property",
  },
];

const markerStyles: Record<MarkerKind, { dot: string; ring: string }> = {
  university: { dot: "#7f3b75", ring: "rgba(127, 59, 117, 0.18)" },
  property: { dot: "#25856f", ring: "rgba(37, 133, 111, 0.18)" },
};

export default function HomeMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [18.18, 42.62],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    L.control.zoom({ position: "bottomleft" }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

    mapMarkers.forEach((marker) => {
      const style = markerStyles[marker.kind];
      const icon = L.divIcon({
        className: "",
        html: `
          <span style="
            display: flex;
            width: 22px;
            height: 22px;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            background: ${style.ring};
          ">
            <span style="
              width: 10px;
              height: 10px;
              border-radius: 9999px;
              background: ${style.dot};
              box-shadow: 0 8px 20px rgba(31,41,55,.2);
            "></span>
          </span>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([marker.lat, marker.lng], { icon })
        .addTo(map)
        .bindTooltip(marker.label, {
          direction: "top",
          offset: [0, -8],
          opacity: 0.95,
          className: "saknaha-map-tooltip",
        });
    });

    const house = mapMarkers.find((marker) => marker.kind === "property");
    const universities = mapMarkers.filter((marker) => marker.kind === "university");

    if (house) {
      const colors = ["#7f3b75", "#25856f", "#4f8aa8"];
      universities.forEach((university, index) => {
        L.polyline(
          [
            [university.lat, university.lng],
            [house.lat, house.lng],
          ],
          {
            color: colors[index % colors.length],
            weight: 4,
            opacity: 0.52,
            dashArray: "8 8",
          },
        ).addTo(map);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative z-0 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-soft">
      <div
        ref={containerRef}
        className="relative z-0 h-[320px] w-full sm:h-[380px] lg:h-[470px]"
        aria-label="خريطة أبها"
      />
      <div className="pointer-events-none absolute right-4 top-4 rounded-2xl bg-white p-3 text-right shadow-sm ring-1 ring-stone-100">
        <p className="text-xs font-black text-berry">معاينة أبها</p>
        <div className="mt-2 space-y-2 text-xs font-bold text-stone-600">
          <MapLegend color={markerStyles.university.dot} label="جامعة أو فرع جامعي" />
          <MapLegend color={markerStyles.property.dot} label="سكن متاح بالقرب منها" />
        </div>
      </div>
    </div>
  );
}

function MapLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
