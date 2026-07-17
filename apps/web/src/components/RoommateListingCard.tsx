import { ArrowLeft, BedDouble, Building2, MapPin, UserRound } from "lucide-react";
import type { Property, RoommateRequest } from "@saknaha/shared-types";

export interface RoommateListing {
  request: RoommateRequest;
  property: Property;
}

interface RoommateListingCardProps {
  listing: RoommateListing;
  onDetails: (requestId: string) => void;
}

const fallbackNames: Record<string, string> = {
  "demo-user-1": "أريج",
  "demo-user-2": "نورة",
  "demo-user-3": "رهف",
};

function requesterName(request: RoommateRequest) {
  return request.requesterName?.trim() || fallbackNames[request.userId] || "طالبة سكن";
}

function propertyTypeLabel(property: Property) {
  if (property.propertyType === "غرفة") return "فندق";
  return property.propertyType;
}

function housingTypeLabel(property: Property) {
  if (property.classification === "نسائي بالكامل") return "نسائي بالكامل";
  if (property.classification === "دور نسائي داخل سكن عوائل") return "دور نسائي";
  if (property.classification === "عوائل") return "عوائل";
  return "متاح للجميع";
}

function nearbyServiceLabel(property: Property) {
  return property.services.length > 0 ? "خدمات قريبة" : "بدون خدمات مضافة";
}

export default function RoommateListingCard({ listing, onDetails }: RoommateListingCardProps) {
  const { property, request } = listing;
  const pricePerPerson = Math.ceil(property.price / Math.max(1, property.maxResidents));

  return (
    <article
      className="relative flex h-full min-h-[300px] flex-col rounded-2xl border border-stone-200 bg-white p-5 text-right shadow-sm"
      dir="rtl"
    >
      <button
        className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-cyan-600 transition hover:bg-cyan-50"
        onClick={() => onDetails(request.id)}
        aria-label="عرض تفاصيل طلب شريكة السكن"
        type="button"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-500 ring-4 ring-cyan-50/70">
          <UserRound size={30} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black text-ink">{requesterName(request)}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-stone-500">
            <MapPin size={14} aria-hidden="true" />
            {property.city}، {property.neighborhood}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">
          {housingTypeLabel(property)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-linen px-3 py-1 text-berry">
          <Building2 size={13} aria-hidden="true" />
          {propertyTypeLabel(property)}
        </span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
          {nearbyServiceLabel(property)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black text-stone-700">
        <span className="inline-flex items-center justify-center rounded-xl bg-stone-50 px-3 py-2">
          {pricePerPerson.toLocaleString("ar-SA")} ر.س لكل واحدة
        </span>
        <span className="inline-flex items-center justify-center gap-1 rounded-xl bg-stone-50 px-3 py-2">
          <BedDouble size={14} aria-hidden="true" />
          {request.availableRooms.toLocaleString("ar-SA")} غرف متاحة
        </span>
        <span className="col-span-2 line-clamp-1 inline-flex items-center justify-center rounded-xl bg-stone-50 px-3 py-2">
          {request.organization}
        </span>
      </div>

      <p className="mt-4 line-clamp-3 min-h-[4.8rem] text-sm font-bold leading-7 text-stone-600">
        {request.bio}
      </p>
    </article>
  );
}
