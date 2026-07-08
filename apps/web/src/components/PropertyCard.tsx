import { BedDouble, Heart, MapPin, Receipt, Share2, Users } from "lucide-react";
import type { Property } from "@saknaha/shared-types";
import { formatRooms } from "@saknaha/utils/propertyFormat";
import Badge from "./Badge";

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
  return (
    <article className="panel overflow-hidden p-0">
      <div className="relative">
        <img
          src={property.images[0]}
          alt={property.title}
          className={`w-full object-cover ${compact ? "h-40" : "h-52"}`}
        />
        {onFavorite || onShare ? (
          <div className="absolute left-3 top-3 flex gap-2">
            {onShare ? (
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition hover:text-berry"
                onClick={() => onShare(property)}
                aria-label="مشاركة السكن"
              >
                <Share2 size={18} aria-hidden="true" />
              </button>
            ) : null}
            {onFavorite ? (
              <button
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm transition ${
                  isFavorite ? "text-berry" : "text-ink hover:text-berry"
                }`}
                onClick={() => onFavorite(property)}
                aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
              >
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {mapColor ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-linen px-3 py-1 text-xs font-black text-stone-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mapColor }} />
              نقطة الخريطة
            </span>
          ) : null}
          <Badge tone={property.classification.includes("نسائي") ? "berry" : "sky"}>
            {property.classification}
          </Badge>
          {property.allowWhatsappContact ? <Badge tone="mint">تواصل واتساب</Badge> : null}
          <Badge tone={property.status === "published" ? "mint" : "stone"}>
            {property.status === "published"
              ? "منشور"
              : property.status === "draft"
                ? "مسودة"
                : "متوقف"}
          </Badge>
        </div>
        <h3 className="text-xl font-black text-ink">{property.title}</h3>
        <p className="mt-2 flex items-center gap-2 text-sm font-bold text-stone-600">
          <MapPin size={16} aria-hidden="true" />
          {property.city}، {property.neighborhood}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-stone-700">
          <span className="flex items-center gap-2 rounded-xl bg-linen px-3 py-2">
            <Receipt size={16} aria-hidden="true" />
            {property.price.toLocaleString("ar-SA")} ريال
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-linen px-3 py-2">
            <BedDouble size={16} aria-hidden="true" />
            {formatRooms(property)}
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-linen px-3 py-2">
            <Users size={16} aria-hidden="true" />
            {property.paymentType}
          </span>
          <span className="rounded-xl bg-linen px-3 py-2">{property.distanceText}</span>
        </div>
        <button className="primary-button mt-5 w-full" onClick={() => onView(property)}>
          {actionLabel}
        </button>
      </div>
    </article>
  );
}
