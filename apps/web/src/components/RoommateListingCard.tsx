import { ArrowLeft, BedDouble, Building2, MapPin, UserRound } from "lucide-react";
import type { Property, RoommateRequest } from "@saknaha/shared-types";
import {
  getRoommatePricePerPerson,
  getRoommateRequesterName,
} from "../services/listingPresentation";

export interface RoommateListing {
  request: RoommateRequest;
  property: Property;
}

interface RoommateListingCardProps {
  listing: RoommateListing;
  onDetails: (requestId: string) => void;
  featured?: boolean;
}

function propertyTypeLabel(property: Property) {
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

export default function RoommateListingCard({
  listing,
  onDetails,
  featured = false,
}: RoommateListingCardProps) {
  const { property, request } = listing;
  const pricePerPerson = getRoommatePricePerPerson(request, property);

  return (
    <article
      className={`relative flex h-fit min-h-0 flex-col overflow-hidden rounded-none border border-stone-200 bg-white text-right shadow-[0_10px_30px_rgba(45,28,42,0.07)] transition hover:-translate-y-0.5 hover:border-berry/30 hover:shadow-[0_16px_40px_rgba(75,38,68,0.12)] ${featured ? "p-3.5" : "p-4"}`}
      dir="rtl"
    >
      <button
        className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-berry transition hover:border-berry hover:bg-fuchsia-50"
        onClick={() => onDetails(request.id)}
        aria-label="عرض تفاصيل طلب شريكة السكن"
        type="button"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-fuchsia-50 text-berry ring-4 ring-fuchsia-50/70">
          <UserRound size={27} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black text-ink">
            {getRoommateRequesterName(request)}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-stone-500">
            <MapPin size={14} aria-hidden="true" />
            {property.city}، {property.neighborhood}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-black">
        <span className="bg-fuchsia-50 px-3 py-1 text-berry">{housingTypeLabel(property)}</span>
        <span className="inline-flex items-center gap-1 bg-linen px-3 py-1 text-berry">
          <Building2 size={13} aria-hidden="true" />
          {propertyTypeLabel(property)}
        </span>
        {!featured ? (
          <span className="bg-emerald-50 px-3 py-1 text-emerald-700">
            {nearbyServiceLabel(property)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs font-black text-stone-700">
        <span className="inline-flex items-center justify-center border border-stone-100 bg-stone-50 px-3 py-2">
          {pricePerPerson.toLocaleString("ar-SA")} ر.س لكل واحدة
        </span>
        <span className="inline-flex items-center justify-center gap-1 border border-stone-100 bg-stone-50 px-3 py-2">
          <BedDouble size={14} aria-hidden="true" />
          {request.availableRooms.toLocaleString("ar-SA")} غرف متاحة
        </span>
        <span className="col-span-2 line-clamp-1 inline-flex items-center justify-center border border-stone-100 bg-stone-50 px-3 py-2">
          {request.organization}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-stone-600">{request.bio}</p>
    </article>
  );
}
