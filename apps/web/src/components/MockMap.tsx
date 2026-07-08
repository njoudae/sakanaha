import { MapPin } from "lucide-react";
import type { Property, UniversityLocation } from "@saknaha/shared-types";

interface MockMapProps {
  properties: Property[];
  selectedUniversity?: UniversityLocation | null;
}

const markerColors = ["#7f3b75", "#25856f", "#4f8aa8", "#b86b5a", "#6b5b95"];

export default function MockMap({ properties, selectedUniversity }: MockMapProps) {
  const visibleProperties = properties.slice(0, 5);

  return (
    <div className="relative min-h-72 overflow-hidden rounded-2xl border border-sky-100 bg-[#d9eceb] shadow-sm">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,rgba(255,255,255,.65)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.65)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute right-5 top-5 z-10 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-100">
        <p className="text-sm font-black text-ink">خريطة تقريبية</p>
        <p className="text-xs text-stone-500">كل نقطة تمثل سكنًا مختلفًا</p>
      </div>

      {selectedUniversity ? (
        <div className="absolute left-[18%] top-[28%] z-10 flex items-center gap-2 rounded-full bg-berry px-3 py-2 text-sm font-bold text-white shadow-soft">
          <MapPin size={16} aria-hidden="true" />
          {selectedUniversity.name}
        </div>
      ) : null}

      {visibleProperties.map((property, index) => {
        const color = markerColors[index % markerColors.length];
        return (
          <div
            key={property.id}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
            style={{
              right: `${20 + index * 13}%`,
              bottom: `${24 + (index % 3) * 17}%`,
            }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
              title={property.title}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
            </span>
            <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-black text-ink shadow-sm sm:inline">
              {property.neighborhood}
            </span>
          </div>
        );
      })}

      {visibleProperties.length > 0 ? (
        <div className="absolute bottom-4 right-4 z-10 max-w-[85%] rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
          <p className="text-xs font-black text-ink">الألوان على الخريطة</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleProperties.map((property, index) => (
              <div
                key={property.id}
                className="flex items-center gap-1.5 rounded-full bg-linen px-2 py-1"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: markerColors[index % markerColors.length] }}
                />
                <span className="text-xs font-bold text-stone-600">{property.neighborhood}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
