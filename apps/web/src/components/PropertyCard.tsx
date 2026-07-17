import { BedDouble, GraduationCap, Heart, MapPin, Share2, Store } from "lucide-react";
import type { Property } from "@saknaha/shared-types";
import { formatRooms } from "@saknaha/utils/propertyFormat";

type DisplayPropertyType = "عمارة" | "شقة" | "فندق" | "دور";
type AvailabilityState = "available" | "nearlyFull" | "full";

interface PropertyCardProps {
  property: Property;
  onView: (property: Property) => void;
  compact?: boolean;
  actionLabel?: string;
  isFavorite?: boolean;
  onFavorite?: (property: Property) => void;
  onShare?: (property: Property) => void;
  mapColor?: string;
}

const specialCardPresentation: Partial<
  Record<
    string,
    {
      type: DisplayPropertyType;
      title: string;
      availability: AvailabilityState;
    }
  >
> = {
  "mock-riyadh-yasmin": {
    type: "فندق",
    title: "فندق بالقرب من جامعة الملك خالد",
    availability: "available",
  },
  "mock-jeddah-salama": {
    type: "دور",
    title: "دور نسائي",
    availability: "nearlyFull",
  },
  "mock-dammam-faisaliyah": {
    type: "شقة",
    title: "شقة في عمارة عوائل",
    availability: "full",
  },
};

const availabilityStyles: Record<AvailabilityState, string> = {
  available: "bg-emerald-100 text-ink",
  nearlyFull: "bg-rose-100 text-ink",
  full: "bg-stone-300 text-ink",
};

const availabilityLabels: Record<AvailabilityState, string> = {
  available: "متاح",
  nearlyFull: "شبه ممتلئ",
  full: "ممتلئ",
};

function classificationLabel(property: Property) {
  if (property.id.startsWith("mock-")) return "عمارة نسائية بالكامل";
  if (property.classification === "نسائي بالكامل") return "عمارة نسائية بالكامل";
  if (property.classification === "دور نسائي داخل سكن عوائل") return "دور نسائي في عمارة عوائل";
  if (property.classification === "متاح للجميع") return "فندق";
  if (property.classification === "عوائل") return "شقة في عمارة عوائل";
  return property.classification;
}

function typeLabel(property: Property): DisplayPropertyType {
  if (property.propertyType === "عمارة") return "عمارة";
  if (property.propertyType === "دور") return "دور";
  if (property.propertyType === "شقة") return "شقة";
  return "فندق";
}

function getPresentation(property: Property) {
  const special = specialCardPresentation[property.id];
  if (special) return special;

  if (!property.id.startsWith("mock-")) {
    return {
      type: typeLabel(property),
      title: classificationLabel(property),
      availability: property.status === "published" ? ("available" as const) : ("full" as const),
    };
  }

  return {
    type: "عمارة" as const,
    title: "عمارة نسائية بالكامل",
    availability: property.status === "published" ? ("available" as const) : ("full" as const),
  };
}

function hasNearbyUniversity(property: Property) {
  const value = property.universityNearby.trim();
  return value.length > 0 && value !== "غير محدد";
}

export default function PropertyCard({
  property,
  onView,
  compact,
  actionLabel = "عرض التفاصيل",
  isFavorite,
  onFavorite,
  onShare,
  mapColor,
}: PropertyCardProps) {
  const presentation = getPresentation(property);
  const isHotel = presentation.type === "فندق";
  const price = (isHotel ? 100 : property.price).toLocaleString("ar-SA");
  const pricePeriod = isHotel ? "يوم" : "شهر";

  return (
    <article className="group min-w-0 rounded-2xl bg-transparent text-right" dir="rtl">
      <div className="relative overflow-hidden rounded-2xl bg-stone-100 shadow-sm">
        <button
          className="block w-full"
          onClick={() => onView(property)}
          type="button"
          aria-label={`${actionLabel}: ${presentation.title}`}
        >
          <img
            src={property.images[0]}
            alt={presentation.title}
            className={`w-full object-cover transition duration-300 group-hover:scale-[1.03] ${
              compact ? "h-48" : "h-60"
            }`}
          />
        </button>

        <div className="absolute left-3 top-3 flex gap-2">
          {onFavorite ? (
            <button
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition ${
                isFavorite ? "text-berry" : "text-ink hover:text-berry"
              }`}
              onClick={() => onFavorite(property)}
              aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
              type="button"
            >
              <Heart size={19} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          ) : null}
          {onShare ? (
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur transition hover:text-berry"
              onClick={() => onShare(property)}
              aria-label="مشاركة السكن"
              type="button"
            >
              <Share2 size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {mapColor ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-stone-700 shadow-sm backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mapColor }} />
            نقطة الخريطة
          </span>
        ) : null}
      </div>

      <button
        className="mt-3 block w-full text-right"
        onClick={() => onView(property)}
        type="button"
      >
        <div className="flex items-center justify-between gap-3 text-sm font-bold">
          <span
            className={`inline-flex min-w-0 items-center rounded-full px-3 py-1 text-xs font-black ${availabilityStyles[presentation.availability]}`}
          >
            {availabilityLabels[presentation.availability]}
          </span>
          <span className="shrink-0 rounded-full bg-linen px-3 py-1 text-xs font-black text-berry">
            {presentation.type}
          </span>
        </div>

        <h3 className="mt-2 line-clamp-1 text-lg font-black text-ink">{presentation.title}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-stone-500">
          <MapPin size={15} aria-hidden="true" />
          {property.city}، {property.neighborhood}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-stone-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
            <BedDouble size={15} aria-hidden="true" />
            {formatRooms(property)}
          </span>
          {property.services.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
              <Store size={15} aria-hidden="true" />
              خدمات قريبة
            </span>
          ) : null}
          {hasNearbyUniversity(property) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
              <GraduationCap size={15} aria-hidden="true" />
              جامعة قريبة
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-base font-black text-ink">
          {price} ر.س <span className="font-bold text-stone-500">/ {pricePeriod}</span>
        </p>
      </button>
    </article>
  );
}
