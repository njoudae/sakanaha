import {
  Bath,
  BedDouble,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  Landmark,
  MapPin,
  Share2,
  Sparkles,
  Store,
  Wifi,
} from "lucide-react";
import type { Property } from "@saknaha/shared-types";
import { formatRooms } from "@saknaha/utils/propertyFormat";
import { useState } from "react";
import {
  getPropertyCardPresentation,
  type PropertyCardAvailability,
} from "../services/listingPresentation";
import { getAvailableUnits } from "../services/propertyAvailability";

interface PropertyCardProps {
  property: Property;
  onView: (property: Property) => void;
  compact?: boolean;
  featured?: boolean;
  actionLabel?: string;
  isFavorite?: boolean;
  onFavorite?: (property: Property) => void;
  onShare?: (property: Property) => void;
  mapColor?: string;
}

const availabilityStyles: Record<PropertyCardAvailability, string> = {
  available: "bg-emerald-500 text-white",
  nearlyFull: "bg-amber-500 text-white",
  full: "bg-stone-700 text-white",
};

const availabilityLabels: Record<PropertyCardAvailability, string> = {
  available: "متاح",
  nearlyFull: "متبقي القليل",
  full: "ممتلئ",
};

function hasInternet(property: Property) {
  return (
    property.rentIncludes?.includes("internet") ||
    property.services.some((service) => service.name.includes("إنترنت"))
  );
}

function hasSecurityCameras(property: Property) {
  return property.features?.includes("security_cameras") ?? false;
}

export default function PropertyCard({
  property,
  onView,
  compact,
  featured = false,
  actionLabel = "عرض التفاصيل",
  isFavorite,
  onFavorite,
  onShare,
  mapColor,
}: PropertyCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [localFavorite, setLocalFavorite] = useState(false);
  const presentation = getPropertyCardPresentation(property);
  const imageCount = property.images.length;
  const safeImageIndex = Math.min(activeImageIndex, Math.max(0, imageCount - 1));
  const favorite = isFavorite ?? localFavorite;
  const availableUnits = getAvailableUnits(property);

  function toggleFavorite() {
    if (onFavorite) onFavorite(property);
    else setLocalFavorite((current) => !current);
  }

  return (
    <article
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-none border border-stone-200 bg-white text-right shadow-[0_10px_30px_rgba(45,28,42,0.07)] transition hover:-translate-y-0.5 hover:border-berry/30 hover:shadow-[0_16px_40px_rgba(75,38,68,0.12)]"
      dir="rtl"
    >
      <div className="relative overflow-hidden bg-stone-100">
        <button
          className="block w-full"
          onClick={() => onView(property)}
          type="button"
          aria-label={`${actionLabel}: ${presentation.title}`}
        >
          {property.images[safeImageIndex] ? (
            <img
              src={property.images[safeImageIndex]}
              alt={presentation.title}
              className={`w-full object-cover transition duration-500 group-hover:scale-[1.035] ${
                featured ? "h-44 sm:h-48" : compact ? "h-48" : "h-60"
              }`}
            />
          ) : (
            <span
              className={`flex w-full items-center justify-center bg-linen px-5 text-sm font-extrabold text-stone-500 ${
                featured ? "h-44 sm:h-48" : compact ? "h-48" : "h-60"
              }`}
            >
              لا توجد صورة متاحة
            </span>
          )}
        </button>

        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold shadow-sm ${availabilityStyles[presentation.availability]}`}
        >
          <Sparkles size={13} aria-hidden="true" />
          {availabilityLabels[presentation.availability]}
          {presentation.availability !== "full"
            ? ` · ${availableUnits.toLocaleString("ar-SA")} وحدات`
            : ""}
        </span>

        <div className="absolute left-3 top-3 flex gap-2">
          <button
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur transition ${
              favorite ? "text-berry" : "text-ink hover:text-berry"
            }`}
            onClick={toggleFavorite}
            aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            type="button"
          >
            <Heart size={19} fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
          </button>
          {onShare ? (
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink shadow-md backdrop-blur transition hover:text-berry"
              onClick={() => onShare(property)}
              aria-label="مشاركة السكن"
              type="button"
            >
              <Share2 size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {imageCount > 1 ? (
          <>
            <button
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur transition hover:bg-white"
              type="button"
              aria-label="الصورة السابقة"
              onClick={() =>
                setActiveImageIndex((current) => (current - 1 + imageCount) % imageCount)
              }
            >
              <ChevronRight size={19} aria-hidden="true" />
            </button>
            <button
              className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur transition hover:bg-white"
              type="button"
              aria-label="الصورة التالية"
              onClick={() => setActiveImageIndex((current) => (current + 1) % imageCount)}
            >
              <ChevronLeft size={19} aria-hidden="true" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {property.images.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full shadow-sm transition-all ${
                    index === safeImageIndex ? "w-5 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}

        {mapColor ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-white/95 px-3 py-1 text-xs font-extrabold text-stone-700 shadow-sm backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mapColor }} />
            نقطة الخريطة
          </span>
        ) : null}
      </div>

      <button
        className="flex min-h-0 flex-1 flex-col px-3.5 pb-3 pt-2.5 text-right"
        onClick={() => onView(property)}
        type="button"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-berry">
          <span>{presentation.type}</span>
          <span className="h-1 w-1 rounded-full bg-stone-300" />
          <span>{presentation.classification}</span>
        </div>

        <h3 className="mt-1.5 line-clamp-1 text-lg font-extrabold text-ink">
          {presentation.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-stone-500">
          <MapPin size={15} aria-hidden="true" />
          {property.city}، حي {property.neighborhood}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-stone-100 py-2.5 text-xs font-bold text-stone-600">
          <span className="inline-flex items-center gap-1">
            <BedDouble size={15} aria-hidden="true" />
            {formatRooms(property)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath size={15} aria-hidden="true" />
            {property.bathrooms.toLocaleString("ar-SA")} حمام
          </span>
          {property.hasElevator ? (
            <span className="inline-flex items-center gap-1">
              <Building2 size={15} aria-hidden="true" />
              مصعد
            </span>
          ) : null}
          {hasInternet(property) ? (
            <span className="inline-flex items-center gap-1">
              <Wifi size={15} aria-hidden="true" />
              إنترنت
            </span>
          ) : null}
          {hasSecurityCameras(property) ? (
            <span className="inline-flex items-center gap-1">
              <Camera size={15} aria-hidden="true" />
              كاميرات مراقبة
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-extrabold">
          {property.rentIncludes?.length ? (
            <span className="inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
              <Sparkles size={13} aria-hidden="true" />
              شامل خدمات
            </span>
          ) : null}
          {property.services.length ? (
            <span className="inline-flex items-center gap-1 bg-sky-50 px-2.5 py-1.5 text-sky-700">
              <Store size={13} aria-hidden="true" />
              قريب من الخدمات
            </span>
          ) : null}
          {property.landmark ? (
            <span className="inline-flex min-w-0 items-center gap-1 bg-fuchsia-50 px-2.5 py-1.5 text-berry">
              <Landmark size={13} aria-hidden="true" />
              <span className="max-w-32 truncate">{property.landmark}</span>
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-xl font-extrabold text-ink">
            {presentation.price.toLocaleString("ar-SA")}{" "}
            <span className="text-xs font-bold text-stone-500">ر.س</span>
          </p>
          <span className="bg-linen px-2.5 py-1.5 text-xs font-extrabold text-berry">
            {presentation.pricePeriod}
          </span>
        </div>
      </button>
    </article>
  );
}
