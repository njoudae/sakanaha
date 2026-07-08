import { BedDouble, DoorOpen, GraduationCap, MapPin, Receipt, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getPropertyById, getRoommateRequests } from "../services/propertyService";
import type { Property, RoommateRequest } from "@saknaha/shared-types";

interface RoommatesPageProps {
  onDetails: (requestId: string) => void;
}

interface RoommateListing {
  request: RoommateRequest;
  property: Property;
}

export default function RoommatesPage({ onDetails }: RoommatesPageProps) {
  const listings = getRoommateRequests()
    .map((request) => {
      const property = getPropertyById(request.propertyId);
      return property ? { request, property } : null;
    })
    .filter(Boolean) as RoommateListing[];

  const city = listings[0]?.property.city ?? "أبها";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 text-center">
        <p className="text-sm font-black text-berry">شريكة سكن</p>
        <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">شريك سكن في {city}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-8 text-stone-600 md:text-base">
          بطاقات مختصرة لوحدات سكنية تبحث ساكناتها عن شريكات. افتحي التفاصيل لمراجعة السكن والصور
          والمسافة.
        </p>
      </header>

      {listings.length === 0 ? (
        <div className="panel text-center">
          <h2 className="text-xl font-black text-ink">لا توجد طلبات حالياً</h2>
          <p className="mt-2 text-sm font-bold text-stone-600">
            يمكنك فتح تفاصيل أي سكن وتسجيل طلب شريكة سكن.
          </p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <RoommateCard key={listing.request.id} listing={listing} onDetails={onDetails} />
          ))}
        </section>
      )}
    </main>
  );
}

function RoommateCard({
  listing,
  onDetails,
}: {
  listing: RoommateListing;
  onDetails: (requestId: string) => void;
}) {
  const { property, request } = listing;
  const pricePerPerson = Math.ceil(property.price / Math.max(1, property.maxResidents));

  return (
    <article className="rounded-3xl border border-stone-100 bg-white/95 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-ink">{property.title}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-stone-600">
            <MapPin size={16} aria-hidden="true" />
            {property.neighborhood} - {property.city}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-mintdeep">
          <UserRound size={24} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip>{request.userType === "student" ? "طالبة" : "موظفة"}</Chip>
        <Chip>تبحث عن شريكة</Chip>
        <Chip>{request.moveInDate}</Chip>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Fact icon={GraduationCap} label="الجامعة أو جهة العمل" value={request.organization} />
        <Fact
          icon={Receipt}
          label="السعر الكلي"
          value={`${property.price.toLocaleString("ar-SA")} ريال`}
        />
        <Fact
          icon={UserRound}
          label="سعر الفرد المتوقع"
          value={`${pricePerPerson.toLocaleString("ar-SA")} ريال`}
          highlight
        />
        <Fact
          icon={BedDouble}
          label="الغرف الكلي"
          value={`${property.maxRooms.toLocaleString("ar-SA")} غرف`}
        />
        <Fact
          icon={DoorOpen}
          label="الغرف المتاحة"
          value={`${request.availableRooms.toLocaleString("ar-SA")} غرفة`}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-linen p-3">
        <p className="text-xs font-bold text-stone-500">نبذة مختصرة</p>
        <p className="mt-1 line-clamp-2 text-sm font-bold leading-7 text-stone-700">
          {request.bio}
        </p>
      </div>

      <button className="primary-button mt-4 w-full" onClick={() => onDetails(request.id)}>
        التفاصيل
      </button>
    </article>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">
      {children}
    </span>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-linen p-3">
      <p className="flex items-center gap-2 text-xs font-bold text-stone-500">
        <Icon size={15} aria-hidden="true" />
        {label}
      </p>
      <p className={`mt-1 font-black ${highlight ? "text-lg text-berry" : "text-ink"}`}>{value}</p>
    </div>
  );
}
